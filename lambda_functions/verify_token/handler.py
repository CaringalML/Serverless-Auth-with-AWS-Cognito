import json
import boto3
import os
import sys
from botocore.exceptions import ClientError

sys.path.append('/opt')
from utils import create_response

cognito_client = boto3.client('cognito-idp')

def lambda_handler(event, context):
    """
    Verify token endpoint - checks if the user is authenticated via httpOnly cookies
    """
    try:
        # Debug: Print entire event structure to understand cookie handling
        print(f"DEBUG: Full event structure: {json.dumps(event, indent=2, default=str)}")
        
        # Extract access token from httpOnly cookie
        # API Gateway can pass cookies in different ways
        headers = event.get('headers', {})
        cookies = headers.get('Cookie') or headers.get('cookie', '')
        access_token = None
        
        print(f"DEBUG: Headers received: {headers}")
        print(f"DEBUG: Cookie header content: '{cookies}'")
        
        if cookies:
            cookie_parts = cookies.split(';')
            print(f"DEBUG: Split cookies into {len(cookie_parts)} parts")
            for i, cookie in enumerate(cookie_parts):
                cookie = cookie.strip()
                print(f"DEBUG: Cookie {i}: '{cookie}'")
                if cookie.startswith('accessToken='):
                    access_token = cookie.split('=', 1)[1]
                    print(f"DEBUG: Found accessToken: {access_token[:20]}...")
                    break
        
        if not access_token:
            print(f"DEBUG: No access token found. Available cookies: {cookies}")
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