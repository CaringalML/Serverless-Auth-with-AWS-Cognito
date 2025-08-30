import json
import boto3
import os
from botocore.exceptions import ClientError

def create_response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': os.environ.get('CORS_ALLOW_ORIGIN'),
            'Access-Control-Allow-Headers': os.environ.get('CORS_ALLOW_HEADERS'),
            'Access-Control-Allow-Methods': os.environ.get('CORS_ALLOW_METHODS'),
            'Access-Control-Allow-Credentials': os.environ.get('CORS_ALLOW_CREDENTIALS')
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