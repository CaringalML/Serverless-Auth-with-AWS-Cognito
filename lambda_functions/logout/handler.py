import json
import boto3
import os
import sys
from botocore.exceptions import ClientError

sys.path.append('/opt')
from utils import create_response, create_cookie

def lambda_handler(event, context):
    """
    Logout handler - clears httpOnly cookies by setting them with expired timestamps
    """
    try:
        # Create expired cookies to clear them
        cookies = [
            create_cookie('accessToken', '', max_age_seconds=0, http_only=True),
            create_cookie('idToken', '', max_age_seconds=0, http_only=True),
            create_cookie('refreshToken', '', max_age_seconds=0, http_only=True)
        ]
        
        return create_response(200, {
            'message': 'Logout successful'
        }, cookies=cookies)
        
    except Exception as e:
        return create_response(500, {'error': f'Internal server error: {str(e)}'})