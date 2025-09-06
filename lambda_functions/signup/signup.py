import json
import boto3
import os
import sys
from botocore.exceptions import ClientError

sys.path.append('/opt')
from utils import create_response, parse_body
from turnstile import verify_turnstile

cognito_client = boto3.client('cognito-idp')
dynamodb = boto3.resource('dynamodb')

def lambda_handler(event, context):
    try:
        body = parse_body(event)
        
        email = body.get('email')
        password = body.get('password')
        name = body.get('name')
        turnstile_token = body.get('turnstileToken')
        
        if not all([email, password, name]):
            return create_response(400, {
                'error': 'Missing required fields: email, password, and name'
            })
        
        # Verify Turnstile token
        if not turnstile_token:
            return create_response(400, {
                'error': 'Turnstile verification required'
            })
        
        # Get client IP from API Gateway event
        client_ip = None
        if event.get('requestContext', {}).get('identity', {}).get('sourceIp'):
            client_ip = event['requestContext']['identity']['sourceIp']
        
        is_valid, error_message = verify_turnstile(turnstile_token, client_ip)
        if not is_valid:
            return create_response(400, {
                'error': error_message or 'Turnstile verification failed'
            })
        
        client_id = os.environ['COGNITO_CLIENT_ID']
        
        try:
            response = cognito_client.sign_up(
                ClientId=client_id,
                Username=email,
                Password=password,
                UserAttributes=[
                    {
                        'Name': 'email',
                        'Value': email
                    },
                    {
                        'Name': 'name',
                        'Value': name
                    }
                ]
            )
            
            table = dynamodb.Table(os.environ['USERS_TABLE'])
            table.put_item(
                Item={
                    'userId': response['UserSub'],
                    'email': email,
                    'name': name,
                    'createdAt': context.aws_request_id,
                    'verified': False
                }
            )
            
            return create_response(200, {
                'message': 'User registered successfully. Please check your email for verification code.',
                'userId': response['UserSub']
            })
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'UsernameExistsException':
                return create_response(409, {'error': 'User already exists'})
            elif error_code == 'InvalidPasswordException':
                return create_response(400, {'error': 'Invalid password format'})
            else:
                return create_response(400, {'error': str(e)})
                
    except Exception as e:
        return create_response(500, {'error': f'Internal server error: {str(e)}'})