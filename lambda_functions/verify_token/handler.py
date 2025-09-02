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
        # Extract access token from httpOnly cookie
        cookies = event.get('headers', {}).get('Cookie', '')
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