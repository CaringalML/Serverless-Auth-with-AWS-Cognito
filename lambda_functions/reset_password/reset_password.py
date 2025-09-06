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
        code = body.get('code')
        new_password = body.get('newPassword')
        
        if not all([email, code, new_password]):
            return create_response(400, {
                'error': 'Missing required fields: email, code, and newPassword'
            })
        
        client_id = os.environ['COGNITO_CLIENT_ID']
        
        try:
            response = cognito_client.confirm_forgot_password(
                ClientId=client_id,
                Username=email,
                ConfirmationCode=code,
                Password=new_password
            )
            
            return create_response(200, {
                'message': 'Password reset successful'
            })
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'CodeMismatchException':
                return create_response(400, {'error': 'Invalid verification code'})
            elif error_code == 'ExpiredCodeException':
                return create_response(400, {'error': 'Verification code has expired'})
            elif error_code == 'InvalidPasswordException':
                return create_response(400, {'error': 'Invalid password format'})
            else:
                return create_response(400, {'error': str(e)})
                
    except Exception as e:
        return create_response(500, {'error': f'Internal server error: {str(e)}'})