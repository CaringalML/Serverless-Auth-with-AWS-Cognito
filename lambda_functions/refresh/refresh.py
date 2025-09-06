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
    extract_and_decrypt_token_from_cookie,
    should_use_kms_encryption
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
            
            # Determine if KMS encryption should be used
            use_kms = should_use_kms_encryption()
            
            if use_kms:
                # Create KMS-encrypted cookies for refreshed tokens
                cookies = [
                    create_encrypted_cookie(
                        'accessToken', 
                        access_token, 
                        token_type='access',
                        max_age_seconds=expires_in
                    ),
                    create_encrypted_cookie(
                        'idToken', 
                        id_token,
                        token_type='id', 
                        max_age_seconds=expires_in
                    )
                ]
                print("Successfully created KMS-encrypted cookies for token refresh")
            else:
                # Create standard httpOnly cookies
                cookies = [
                    create_cookie('accessToken', access_token, max_age_seconds=expires_in, http_only=True),
                    create_cookie('idToken', id_token, max_age_seconds=expires_in, http_only=True)
                ]
                print("Created standard httpOnly cookies for token refresh")
            
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