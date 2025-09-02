import json
import boto3
import os
import sys
from botocore.exceptions import ClientError

sys.path.append('/opt')
from utils import create_response, parse_body, create_cookie

cognito_client = boto3.client('cognito-idp')

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
            
            # Create httpOnly cookies for tokens
            cookies = [
                create_cookie('accessToken', access_token, max_age_seconds=expires_in, http_only=True),
                create_cookie('idToken', id_token, max_age_seconds=expires_in, http_only=True),
                create_cookie('refreshToken', refresh_token, max_age_seconds=30*24*60*60, http_only=True)  # 30 days
            ]
            
            # Return success without exposing tokens in response body
            return create_response(200, {
                'message': 'Sign in successful',
                'expiresIn': expires_in
            }, cookies=cookies)
            
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