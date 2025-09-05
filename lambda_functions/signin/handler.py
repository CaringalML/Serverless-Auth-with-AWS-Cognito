import json
import boto3
import os
import sys
import base64
from botocore.exceptions import ClientError
from datetime import datetime, timezone

sys.path.append('/opt')
from utils import create_response, parse_body, create_cookie

cognito_client = boto3.client('cognito-idp')
dynamodb = boto3.resource('dynamodb')

def decode_token_payload(token):
    """Decode JWT token payload (second part)"""
    try:
        # JWT tokens have 3 parts separated by dots
        parts = token.split('.')
        if len(parts) != 3:
            return None
        
        # Get the payload (middle part) and add padding if needed
        payload = parts[1]
        padding = len(payload) % 4
        if padding:
            payload += '=' * (4 - padding)
            
        decoded_bytes = base64.urlsafe_b64decode(payload)
        decoded_str = decoded_bytes.decode('utf-8')
        return json.loads(decoded_str)
    except Exception:
        return None

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
        
        
        if not all([email, password]):
            return create_response(400, {
                'error': 'Missing required fields: email and password'
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
            
            # SECURE HTTPONLY COOKIES: Maximum security against XSS and CSRF
            # - HttpOnly: Prevents JavaScript access (XSS protection)
            # - Secure: HTTPS only transmission 
            # - SameSite=Strict: Same-domain only (CSRF protection)
            cookies = [
                create_cookie('accessToken', access_token, max_age_seconds=expires_in, http_only=True),
                create_cookie('idToken', id_token, max_age_seconds=expires_in, http_only=True), 
                create_cookie('refreshToken', refresh_token, max_age_seconds=30*24*60*60, http_only=True)  # 30 days
            ]
            
            # Return success with user info for immediate use
            response_data = {
                'message': 'Sign in successful',
                'expiresIn': expires_in
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