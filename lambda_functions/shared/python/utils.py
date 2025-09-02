import json
import boto3
import os
from botocore.exceptions import ClientError
from datetime import datetime, timedelta

def create_response(status_code, body, cookies=None):
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': os.environ.get('CORS_ALLOW_ORIGIN'),
        'Access-Control-Allow-Headers': os.environ.get('CORS_ALLOW_HEADERS'),
        'Access-Control-Allow-Methods': os.environ.get('CORS_ALLOW_METHODS'),
        'Access-Control-Allow-Credentials': 'true'  # Required for cookies
    }
    
    response = {
        'statusCode': status_code,
        'headers': headers,
        'body': json.dumps(body)
    }
    
    # Add Set-Cookie headers if cookies are provided
    if cookies:
        response['multiValueHeaders'] = {
            'Set-Cookie': cookies
        }
    
    return response

def create_cookie(name, value, max_age_seconds=None, http_only=True, secure=True, same_site='None'):
    """
    Create a cookie string with security settings
    
    Args:
        name: Cookie name
        value: Cookie value
        max_age_seconds: Cookie lifetime in seconds (default: 7 days for access token, 30 days for refresh)
        http_only: Prevent JavaScript access (default: True)
        secure: Only send over HTTPS (default: True)
        same_site: CSRF protection (default: 'None' for cross-origin testing)
    """
    cookie_parts = [f"{name}={value}"]
    
    if max_age_seconds:
        cookie_parts.append(f"Max-Age={max_age_seconds}")
        # Also add Expires for older browser compatibility
        expires = datetime.utcnow() + timedelta(seconds=max_age_seconds)
        cookie_parts.append(f"Expires={expires.strftime('%a, %d %b %Y %H:%M:%S GMT')}")
    
    cookie_parts.append("Path=/")
    
    if http_only:
        cookie_parts.append("HttpOnly")
    
    if secure:
        cookie_parts.append("Secure")
    
    if same_site:
        cookie_parts.append(f"SameSite={same_site}")
    
    return "; ".join(cookie_parts)

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