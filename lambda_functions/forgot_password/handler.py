import json
import boto3
import os
import sys
from botocore.exceptions import ClientError

sys.path.append('/opt')
from utils import create_response, parse_body
from recaptcha import verify_recaptcha, get_recaptcha_error_response

cognito_client = boto3.client('cognito-idp')

def lambda_handler(event, context):
    try:
        body = parse_body(event)
        
        email = body.get('email')
        recaptcha_token = body.get('recaptchaToken')
        
        # Verify reCAPTCHA first (if configured)
        is_valid, score, error_message = verify_recaptcha(recaptcha_token, 'forgot_password')
        if not is_valid:
            return create_response(403, get_recaptcha_error_response(score, error_message))
        
        if not email:
            return create_response(400, {
                'error': 'Missing required field: email'
            })
        
        client_id = os.environ['COGNITO_CLIENT_ID']
        
        try:
            response = cognito_client.forgot_password(
                ClientId=client_id,
                Username=email
            )
            
            return create_response(200, {
                'message': 'Password reset code sent to your email',
                'codeDeliveryDetails': response.get('CodeDeliveryDetails', {})
            })
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'UserNotFoundException':
                return create_response(404, {'error': 'User not found'})
            elif error_code == 'InvalidParameterException':
                return create_response(400, {'error': 'User email not verified'})
            else:
                return create_response(400, {'error': str(e)})
                
    except Exception as e:
        return create_response(500, {'error': f'Internal server error: {str(e)}'})