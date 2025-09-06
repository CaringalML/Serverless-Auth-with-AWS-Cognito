import json
import boto3
import os
import sys
from botocore.exceptions import ClientError
from datetime import datetime, timezone

sys.path.append('/opt')
from utils import (
    create_response, 
    parse_body, 
    create_cookie,
    create_encrypted_cookie,
    create_encrypted_cookies_parallel,
    create_encrypted_cookies_with_cache,
    decode_token_payload,
    should_use_kms_encryption
)
from turnstile import verify_turnstile

cognito_client = boto3.client('cognito-idp')
dynamodb = boto3.resource('dynamodb')

# decode_token_payload is now imported from utils.py

def update_user_login_record(user_info, provider='Email'):
    """Update user record in DynamoDB for regular email/password signin"""
    try:
        table = dynamodb.Table(os.environ['USERS_TABLE'])
        
        # Extract user information
        user_id = user_info.get('sub')
        email = user_info.get('email')
        name = user_info.get('name', '')
        
        if not user_id or not email:
            print(f"Missing required user info: user_id={user_id}, email={email}")
            return False
        
        current_time = datetime.now(timezone.utc).isoformat()
        
        # Check if user already exists
        try:
            response = table.get_item(Key={'userId': user_id})
            if 'Item' in response:
                # User exists, update last login and other tracking fields
                table.update_item(
                    Key={'userId': user_id},
                    UpdateExpression='SET lastLogin = :lastLogin, updatedAt = :updatedAt, provider = :provider, #status = :status',
                    ExpressionAttributeNames={
                        '#status': 'status'  # 'status' is a reserved word in DynamoDB
                    },
                    ExpressionAttributeValues={
                        ':lastLogin': current_time,
                        ':updatedAt': current_time,
                        ':provider': provider,
                        ':status': 'CONFIRMED'
                    }
                )
                print(f"Updated existing user record for {email} with provider {provider}")
                return True
        except Exception as e:
            print(f"Error checking existing user: {str(e)}")
        
        # Create new user record if doesn't exist (shouldn't happen for email signin, but safety net)
        user_record = {
            'userId': user_id,
            'email': email,
            'name': name,
            'verified': True,
            'provider': provider,
            'createdAt': current_time,
            'updatedAt': current_time,
            'lastLogin': current_time,
            'status': 'CONFIRMED'
        }
        
        table.put_item(Item=user_record)
        print(f"Created user record for {email} with provider {provider}")
        return True
        
    except Exception as e:
        print(f"Error updating user login record: {str(e)}")
        return False

def lambda_handler(event, context):
    try:
        body = parse_body(event)
        
        email = body.get('email')
        password = body.get('password')
        turnstile_token = body.get('turnstileToken')
        
        if not all([email, password]):
            return create_response(400, {
                'error': 'Missing required fields: email and password'
            })
        
        # Verify Turnstile token
        if not turnstile_token:
            return create_response(400, {
                'error': 'Turnstile verification required'
            })
        
        # Get client IP from API Gateway event
        client_ip = None
        if event.get('requestContext', {}).get('identity', {}).get('sourceIp'):
            client_ip = event['requestContext']['identity']['sourceIp']
        
        is_valid, error_message = verify_turnstile(turnstile_token, client_ip)
        if not is_valid:
            return create_response(400, {
                'error': error_message or 'Turnstile verification failed'
            })
        
        client_id = os.environ['COGNITO_CLIENT_ID']
        
        try:
            response = cognito_client.initiate_auth(
                ClientId=client_id,
                AuthFlow='USER_PASSWORD_AUTH',
                AuthParameters={
                    'USERNAME': email,
                    'PASSWORD': password
                }
            )
            
            # Extract tokens
            auth_result = response['AuthenticationResult']
            access_token = auth_result['AccessToken']
            id_token = auth_result['IdToken']
            refresh_token = auth_result['RefreshToken']
            expires_in = auth_result['ExpiresIn']
            
            # Decode ID token to get user info
            user_info = decode_token_payload(id_token)
            user_id = user_info.get('sub') if user_info else None
            
            # Update user record in DynamoDB with login tracking
            if user_info:
                # Update database with login activity (lastLogin, provider, status, updatedAt)
                db_update_success = update_user_login_record(user_info, provider='Email')
                if not db_update_success:
                    print("Warning: Failed to update user login record in DynamoDB")
                else:
                    print(f"Successfully updated login record for user: {user_info.get('email')}")
            else:
                print("Warning: Could not decode ID token for database update")
            
            # DETERMINE IF KMS ENCRYPTION SHOULD BE USED
            use_kms = should_use_kms_encryption()
            
            if use_kms:
                print(f"KMS encryption enabled for user: {user_id}")
                # CREATE KMS-ENCRYPTED COOKIES IN PARALLEL - MILITARY-GRADE SECURITY
                # Performance optimized: ~200ms instead of ~600ms via concurrent encryption
                print("Starting parallel KMS encryption for all tokens")
                
                tokens_to_encrypt = [
                    {
                        'name': 'accessToken',
                        'token': access_token,
                        'token_type': 'access',
                        'max_age_seconds': expires_in
                    },
                    {
                        'name': 'idToken', 
                        'token': id_token,
                        'token_type': 'id',
                        'max_age_seconds': expires_in
                    },
                    {
                        'name': 'refreshToken',
                        'token': refresh_token,
                        'token_type': 'refresh', 
                        'max_age_seconds': 30*24*60*60  # 30 days
                    }
                ]
                
                cookies = create_encrypted_cookies_with_cache(tokens_to_encrypt, user_id)
                print("Successfully created KMS-encrypted cookies with caching optimization")
            else:
                # STANDARD HTTPONLY COOKIES (still secure, not encrypted)
                cookies = [
                    create_cookie('accessToken', access_token, max_age_seconds=expires_in, http_only=True),
                    create_cookie('idToken', id_token, max_age_seconds=expires_in, http_only=True), 
                    create_cookie('refreshToken', refresh_token, max_age_seconds=30*24*60*60, http_only=True)  # 30 days
                ]
                print("Using standard httpOnly cookies (KMS not enabled)")
            
            # Return success with user info and encryption status
            response_data = {
                'message': 'Sign in successful',
                'expiresIn': expires_in,
                'encryptionEnabled': use_kms  # Let frontend know if KMS is active
            }
            
            # Add user info if available
            if user_info:
                response_data['user'] = {
                    'sub': user_info.get('sub'),
                    'email': user_info.get('email'),
                    'name': user_info.get('name'),
                    'email_verified': user_info.get('email_verified'),
                    'aud': user_info.get('aud'),
                    'iss': user_info.get('iss'),
                    'exp': user_info.get('exp'),
                    'iat': user_info.get('iat')
                }
            
            return create_response(200, response_data, cookies=cookies)
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'NotAuthorizedException':
                return create_response(401, {'error': 'Incorrect username or password'})
            elif error_code == 'UserNotConfirmedException':
                return create_response(400, {'error': 'User email not verified'})
            elif error_code == 'UserNotFoundException':
                return create_response(404, {'error': 'User not found'})
            else:
                return create_response(400, {'error': str(e)})
                
    except Exception as e:
        return create_response(500, {'error': f'Internal server error: {str(e)}'})