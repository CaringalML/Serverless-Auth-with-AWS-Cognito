import json
import boto3
import os
import sys
from botocore.exceptions import ClientError

sys.path.append('/opt')
from utils import create_response, create_cookie, invalidate_token_cache, extract_and_decrypt_token_from_cookie, decode_token_payload

def lambda_handler(event, context):
    """
    Logout handler - clears httpOnly cookies and invalidates token cache
    """
    try:
        # Extract user ID from existing tokens for cache invalidation
        user_id = None
        try:
            cookies_header = event.get('headers', {}).get('Cookie', '')
            if cookies_header:
                # Try to get user ID from ID token before clearing
                id_token = extract_and_decrypt_token_from_cookie(cookies_header, 'idToken')
                if id_token:
                    id_payload = decode_token_payload(id_token)
                    user_id = id_payload.get('sub') if id_payload else None
        except Exception as e:
            print(f"Warning: Could not extract user ID for cache invalidation: {str(e)}")
        
        # Invalidate cached encrypted tokens if user ID is available
        if user_id:
            cache_invalidated = invalidate_token_cache(user_id)
            if cache_invalidated:
                print(f"Successfully invalidated token cache for user: {user_id}")
            else:
                print(f"Warning: Failed to invalidate token cache for user: {user_id}")
        
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