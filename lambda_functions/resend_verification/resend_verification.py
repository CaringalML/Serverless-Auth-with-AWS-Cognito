import json
import boto3
import os
import sys
import time
from botocore.exceptions import ClientError

sys.path.append('/opt')
from utils import create_response, parse_body

cognito_client = boto3.client('cognito-idp')
dynamodb = boto3.resource('dynamodb')

def lambda_handler(event, context):
    try:
        body = parse_body(event)
        
        email = body.get('email')
        
        if not email:
            return create_response(400, {
                'error': 'Missing required field: email'
            })
        
        client_id = os.environ['COGNITO_CLIENT_ID']
        
        # Check rate limiting in DynamoDB
        table = dynamodb.Table(os.environ['USERS_TABLE'])
        
        try:
            # Query user record by email using GSI
            response = table.query(
                IndexName='EmailIndex',
                KeyConditionExpression='email = :email',
                ExpressionAttributeValues={':email': email}
            )
            
            if not response['Items']:
                return create_response(404, {
                    'error': 'User not found'
                })
            
            user_item = response['Items'][0]
            user_id = user_item['userId']
            current_time = int(time.time())
            
            # Check if user is already verified
            if user_item.get('verified', False):
                return create_response(400, {
                    'error': 'Email is already verified'
                })
            
            # Rate limiting: Allow resend only after 60 seconds
            last_resend_time = user_item.get('lastResendTime', 0)
            time_diff = current_time - last_resend_time
            
            if time_diff < 60:  # 60 seconds cooldown
                remaining_time = 60 - time_diff
                return create_response(429, {
                    'error': f'Please wait {remaining_time} seconds before requesting another code',
                    'remainingTime': remaining_time
                })
            
            # Check daily limit (max 5 resends per day)
            resend_count_today = user_item.get('resendCountToday', 0)
            last_resend_date = user_item.get('lastResendDate', '')
            today = time.strftime('%Y-%m-%d')
            
            if last_resend_date != today:
                # Reset daily count if it's a new day
                resend_count_today = 0
            
            if resend_count_today >= 5:
                return create_response(429, {
                    'error': 'Daily limit exceeded. Maximum 5 verification codes per day.',
                    'dailyLimitExceeded': True
                })
            
        except ClientError as e:
            print(f"DynamoDB error: {str(e)}")
            return create_response(500, {
                'error': 'Failed to check rate limits'
            })
        
        try:
            # Resend verification code
            cognito_client.resend_confirmation_code(
                ClientId=client_id,
                Username=email
            )
            
            # Update rate limiting data in DynamoDB
            table.update_item(
                Key={'userId': user_id},
                UpdateExpression='SET lastResendTime = :time, resendCountToday = :count, lastResendDate = :date',
                ExpressionAttributeValues={
                    ':time': current_time,
                    ':count': resend_count_today + 1,
                    ':date': today
                }
            )
            
            return create_response(200, {
                'message': 'Verification code sent successfully',
                'nextResendAvailable': current_time + 60  # Next resend available after 60 seconds
            })
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'UserNotFoundException':
                return create_response(404, {'error': 'User not found'})
            elif error_code == 'InvalidParameterException':
                return create_response(400, {'error': 'User is already confirmed'})
            elif error_code == 'LimitExceededException':
                return create_response(429, {'error': 'Too many requests. Please try again later.'})
            else:
                return create_response(400, {'error': str(e)})
                
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return create_response(500, {'error': f'Internal server error: {str(e)}'})