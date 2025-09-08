import json
import boto3
import os
import sys
from botocore.exceptions import ClientError

sys.path.append('/opt')
from utils import (
    create_response, 
    parse_body, 
    create_cookie,
    create_encrypted_cookie,
    create_encrypted_cookies_parallel,
    create_encrypted_cookies_with_cache,
    create_encrypted_cookies_smart_cache,
    extract_and_decrypt_token_from_cookie,
    should_use_kms_encryption,
    decode_token_payload
)

cognito_client = boto3.client('cognito-idp')

def lambda_handler(event, context):
    try:
        # Try to get refresh token from cookie (with KMS decryption if enabled)
        cookies_header = event.get('headers', {}).get('Cookie', '')
        refresh_token = extract_and_decrypt_token_from_cookie(cookies_header, 'refreshToken')
        
        # Fall back to body if not in cookies (for backward compatibility)
        if not refresh_token:
            body = parse_body(event)
            refresh_token = body.get('refreshToken')
        
        if not refresh_token:
            return create_response(400, {
                'error': 'Missing required field: refreshToken'
            })
        
        client_id = os.environ['COGNITO_CLIENT_ID']
        
        try:
            response = cognito_client.initiate_auth(
                ClientId=client_id,
                AuthFlow='REFRESH_TOKEN_AUTH',
                AuthParameters={
                    'REFRESH_TOKEN': refresh_token
                }
            )
            
            # Extract new tokens
            auth_result = response['AuthenticationResult']
            access_token = auth_result['AccessToken']
            id_token = auth_result['IdToken']
            expires_in = auth_result['ExpiresIn']
            
            # KMS ENCRYPTION IS MANDATORY - NO FALLBACK FOR SECURITY
            use_kms = should_use_kms_encryption()
            
            if not use_kms:
                # SECURITY: KMS encryption is required - fail fast
                print("ERROR: KMS encryption is required but not enabled")
                return create_response(500, {
                    'error': 'Authentication failed: security requirements not met'
                })
            
            # Create KMS-encrypted cookies in parallel for refreshed tokens
            print("Starting parallel KMS encryption for refreshed tokens")
            
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
                    'token': refresh_token,  # Re-issue the refresh token cookie
                    'token_type': 'refresh',
                    'max_age_seconds': 30*24*60*60  # 30 days
                }
            ]
            
            # Get user ID from ID token for caching
            user_id = None
            if id_token:
                id_payload = decode_token_payload(id_token)
                user_id = id_payload.get('sub') if id_payload else None
            
            if not user_id:
                print("ERROR: Cannot encrypt tokens without user_id")
                return create_response(500, {
                    'error': 'Token refresh failed: user information unavailable'
                })
            
            # Use smart cache that only re-encrypts if tokens actually changed
            try:
                cookies = create_encrypted_cookies_smart_cache(tokens_to_encrypt, user_id)
                print("Successfully created KMS-encrypted cookies for token refresh with smart cache")
            except Exception as e:
                print(f"ERROR: Failed to create encrypted cookies: {str(e)}")
                return create_response(500, {
                    'error': 'Token refresh failed: encryption error'
                })
            
            # Return success without exposing tokens in response body
            return create_response(200, {
                'message': 'Token refreshed successfully',
                'expiresIn': expires_in
            }, cookies=cookies)
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'NotAuthorizedException':
                return create_response(401, {'error': 'Invalid or expired refresh token'})
            elif error_code == 'UserNotFoundException':
                return create_response(404, {'error': 'User not found'})
            else:
                return create_response(400, {'error': str(e)})
                
    except Exception as e:
        return create_response(500, {'error': f'Internal server error: {str(e)}'})