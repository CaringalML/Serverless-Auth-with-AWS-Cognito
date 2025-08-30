import json
import boto3
from botocore.exceptions import ClientError

def create_response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        'body': json.dumps(body)
    }

def parse_body(event):
    try:
        if isinstance(event.get('body'), str):
            return json.loads(event['body'])
        return event.get('body', {})
    except (json.JSONDecodeError, TypeError):
        return {}

def get_user_from_token(token):
    cognito_client = boto3.client('cognito-idp')
    try:
        response = cognito_client.get_user(
            AccessToken=token
        )
        return response
    except ClientError:
        return None