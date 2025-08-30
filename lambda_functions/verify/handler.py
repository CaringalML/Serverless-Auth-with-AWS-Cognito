import json
import boto3
import os
import sys
from botocore.exceptions import ClientError

sys.path.append('/opt')
from utils import create_response, parse_body

cognito_client = boto3.client('cognito-idp')
dynamodb = boto3.resource('dynamodb')

def lambda_handler(event, context):
    try:
        body = parse_body(event)
        
        email = body.get('email')
        code = body.get('code')
        
        if not all([email, code]):
            return create_response(400, {
                'error': 'Missing required fields: email and code'
            })
        
        client_id = os.environ['COGNITO_CLIENT_ID']
        
        try:
            response = cognito_client.confirm_sign_up(
                ClientId=client_id,
                Username=email,
                ConfirmationCode=code
            )
            
            # Update user verification status in DynamoDB
            table = dynamodb.Table(os.environ['USERS_TABLE'])
            
            # First, get the user's userId by email
            response = table.query(
                IndexName='EmailIndex',
                KeyConditionExpression='email = :email',
                ExpressionAttributeValues={':email': email}
            )
            
            if response['Items']:
                user_id = response['Items'][0]['userId']
                table.update_item(
                    Key={'userId': user_id},
                    UpdateExpression='SET verified = :val',
                    ExpressionAttributeValues={':val': True}
                )
            
            return create_response(200, {
                'message': 'Email verified successfully',
                'verified': True
            })
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'CodeMismatchException':
                return create_response(400, {'error': 'Invalid verification code'})
            elif error_code == 'ExpiredCodeException':
                return create_response(400, {'error': 'Verification code has expired'})
            else:
                return create_response(400, {'error': str(e)})
                
    except Exception as e:
        return create_response(500, {'error': f'Internal server error: {str(e)}'})