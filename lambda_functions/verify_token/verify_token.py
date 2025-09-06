import json
import boto3
import os
import sys
from botocore.exceptions import ClientError

sys.path.append('/opt')
from utils import create_response, extract_and_decrypt_token_from_cookie

cognito_client = boto3.client('cognito-idp')

def lambda_handler(event, context):
    """
    KMS-ENHANCED HTTPONLY COOKIE AUTHENTICATION VERIFICATION
    
    Validates user authentication using secure httpOnly cookies with military-grade encryption.
    This endpoint is immune to XSS attacks as tokens are never accessible to JavaScript.
    
    SECURITY ARCHITECTURE:
    - Extracts and decrypts accessToken from KMS-encrypted httpOnly cookie
    - Automatically handles both encrypted and unencrypted tokens
    - Validates decrypted token with AWS Cognito User Pool
    - Returns 200 for valid authentication, 401 for invalid/expired
    - Defense-in-depth: httpOnly + KMS AES-256 encryption
    
    KMS ENCRYPTION SUPPORT:
    - Uses extract_and_decrypt_token_from_cookie utility
    - Requires successful KMS decryption for authentication
    - Fails securely if KMS decryption fails (no fallback)
    
    DOMAINS:
    - Request from: filodelight.online (frontend)
    - Validated by: api.filodelight.online (API)
    - Same root domain enables SameSite=Strict cookie sharing
    """
    try:
        # Extract and decrypt access token from KMS-encrypted httpOnly cookie
        # SECURITY: Requires successful KMS decryption - no fallback for security
        headers = event.get('headers', {})
        cookies_header = headers.get('Cookie') or headers.get('cookie', '')
        
        access_token = extract_and_decrypt_token_from_cookie(cookies_header, 'accessToken')
        
        if not access_token:
            return create_response(401, {'error': 'No access token found'})
        
        try:
            # Verify token with Cognito
            response = cognito_client.get_user(
                AccessToken=access_token
            )
            
            return create_response(200, {
                'message': 'Token is valid',
                'authenticated': True
            })
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code in ['NotAuthorizedException', 'UserNotFoundException']:
                return create_response(401, {'error': 'Invalid or expired token'})
            else:
                return create_response(400, {'error': str(e)})
                
    except Exception as e:
        return create_response(500, {'error': f'Internal server error: {str(e)}'})