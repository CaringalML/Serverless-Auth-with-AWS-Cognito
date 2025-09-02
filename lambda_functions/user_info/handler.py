import json
import boto3
import os
import sys
from botocore.exceptions import ClientError
import base64

sys.path.append('/opt')
from utils import create_response

cognito_client = boto3.client('cognito-idp')

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

def lambda_handler(event, context):
    """
    User info endpoint - returns user information from httpOnly cookies
    """
    try:
        # Extract tokens from httpOnly cookies
        cookies = event.get('headers', {}).get('Cookie', '')
        access_token = None
        id_token = None
        
        if cookies:
            for cookie in cookies.split(';'):
                cookie = cookie.strip()
                if cookie.startswith('accessToken='):
                    access_token = cookie.split('=', 1)[1]
                elif cookie.startswith('idToken='):
                    id_token = cookie.split('=', 1)[1]
        
        if not access_token or not id_token:
            return create_response(401, {'error': 'Authentication tokens not found'})
        
        try:
            # Verify access token with Cognito
            cognito_response = cognito_client.get_user(
                AccessToken=access_token
            )
            
            # Decode ID token to get user info
            user_info = decode_token_payload(id_token)
            
            if not user_info:
                return create_response(400, {'error': 'Invalid ID token'})
            
            # Return user information
            return create_response(200, {
                'sub': user_info.get('sub'),
                'email': user_info.get('email'),
                'name': user_info.get('name'),
                'email_verified': user_info.get('email_verified'),
                'aud': user_info.get('aud'),
                'iss': user_info.get('iss'),
                'exp': user_info.get('exp'),
                'iat': user_info.get('iat')
            })
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code in ['NotAuthorizedException', 'UserNotFoundException']:
                return create_response(401, {'error': 'Invalid or expired token'})
            else:
                return create_response(400, {'error': str(e)})
                
    except Exception as e:
        return create_response(500, {'error': f'Internal server error: {str(e)}'})