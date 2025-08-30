import json
import boto3
import os
import sys
from botocore.exceptions import ClientError

sys.path.append('/opt')
from utils import create_response, parse_body

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
            
            return create_response(200, {
                'message': 'Sign in successful',
                'accessToken': response['AuthenticationResult']['AccessToken'],
                'idToken': response['AuthenticationResult']['IdToken'],
                'refreshToken': response['AuthenticationResult']['RefreshToken'],
                'expiresIn': response['AuthenticationResult']['ExpiresIn']
            })
            
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