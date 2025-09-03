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
    HTTPONLY COOKIE AUTHENTICATION VERIFICATION
    
    Validates user authentication using secure httpOnly cookies.
    This endpoint is immune to XSS attacks as tokens are never accessible to JavaScript.
    
    SECURITY ARCHITECTURE:
    - Extracts accessToken from httpOnly cookie headers
    - Validates token with AWS Cognito User Pool
    - Returns 200 for valid authentication, 401 for invalid/expired
    - No token exposure to frontend JavaScript
    
    COOKIE EXTRACTION:
    API Gateway passes cookies in headers as 'Cookie' or 'cookie'
    Format: 'accessToken=jwt_token; idToken=jwt_token; refreshToken=jwt_token'
    
    DOMAINS:
    - Request from: filodelight.online (frontend)
    - Validated by: source.filodelight.online (API)
    - Same root domain enables SameSite=Strict cookie sharing
    """
    try:
        # Extract access token from httpOnly cookie
        # API Gateway can pass cookies in different ways
        headers = event.get('headers', {})
        cookies = headers.get('Cookie') or headers.get('cookie', '')
        access_token = None
        
        if cookies:
            for cookie in cookies.split(';'):
                cookie = cookie.strip()
                if cookie.startswith('accessToken='):
                    access_token = cookie.split('=', 1)[1]
                    break
        
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