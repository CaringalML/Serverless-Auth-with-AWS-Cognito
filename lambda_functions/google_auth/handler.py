import json
import boto3
import os
import sys
import urllib.parse
import urllib.request
from botocore.exceptions import ClientError

sys.path.append('/opt')
from utils import create_response, create_cookie

cognito_client = boto3.client('cognito-idp')

def lambda_handler(event, context):
    """
    GOOGLE OAUTH AUTHENTICATION HANDLER
    
    Handles Google OAuth 2.0 authentication flow with AWS Cognito User Pool.
    This endpoint processes OAuth authorization codes and exchanges them for JWT tokens
    while maintaining httpOnly cookie security.
    
    OAUTH FLOW:
    1. User clicks "Sign in with Google" → Redirected to Google OAuth consent
    2. Google redirects back with authorization code → This Lambda processes code
    3. Lambda exchanges code for Google tokens via Cognito
    4. Lambda sets httpOnly cookies with JWT tokens → User authenticated
    
    SECURITY IMPLEMENTATION:
    - HttpOnly cookies prevent XSS attacks (tokens invisible to JavaScript)
    - SameSite=Strict prevents CSRF attacks (same-domain only)
    - Secure flag ensures HTTPS-only transmission
    - Same-domain architecture enables secure cookie sharing
    
    REQUEST TYPES:
    - GET /auth/google/login: Initiates OAuth flow (redirects to Google)
    - GET /auth/google/callback: Handles OAuth callback with authorization code
    """
    try:
        # Get HTTP method and path
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '')
        query_params = event.get('queryStringParameters') or {}
        
        if path.endswith('/google/login') or path.endswith('/google'):
            # Initiate Google OAuth flow
            return initiate_google_auth()
        elif path.endswith('/google/callback') or 'code' in query_params:
            # Handle OAuth callback
            return handle_google_callback(query_params)
        else:
            return create_response(400, {'error': 'Invalid Google OAuth endpoint'})
            
    except Exception as e:
        return create_response(500, {'error': f'Internal server error: {str(e)}'})

def initiate_google_auth():
    """
    INITIATE GOOGLE OAUTH FLOW
    
    Redirects user to AWS Cognito hosted UI which handles the Google OAuth flow.
    Cognito manages the OAuth dance with Google and redirects back to our callback.
    
    OAUTH PARAMETERS:
    - client_id: Our Cognito User Pool App Client ID
    - response_type: 'code' for authorization code flow
    - scope: 'openid email profile' for basic user information
    - redirect_uri: Where Google redirects after authentication
    - identity_provider: 'Google' to use Google as the identity provider
    """
    try:
        # Get Cognito configuration
        user_pool_id = os.environ['COGNITO_USER_POOL_ID']
        client_id = os.environ['COGNITO_CLIENT_ID']
        domain = os.environ.get('COGNITO_DOMAIN', f"{os.environ['PROJECT_NAME']}-{os.environ['ENVIRONMENT']}-auth")
        
        # Build OAuth URL through Cognito hosted UI
        # AWS_REGION is automatically set by Lambda runtime
        base_url = f"https://{domain}.auth.{os.environ['AWS_REGION']}.amazoncognito.com"
        
        oauth_params = {
            'client_id': client_id,
            'response_type': 'code',
            'scope': 'openid email profile',
            'redirect_uri': f"https://{os.environ.get('API_DOMAIN', 'api.filodelight.online')}/auth/google/callback",
            'identity_provider': 'Google'
        }
        
        # Build complete OAuth URL
        oauth_url = f"{base_url}/oauth2/authorize?" + urllib.parse.urlencode(oauth_params)
        
        # Redirect to Cognito hosted UI for Google OAuth
        return {
            'statusCode': 302,
            'headers': {
                'Location': oauth_url,
                'Content-Type': 'text/html'
            },
            'body': f'<html><body>Redirecting to Google Sign In...<script>window.location.href="{oauth_url}";</script></body></html>'
        }
        
    except Exception as e:
        return create_response(500, {'error': f'Failed to initiate Google auth: {str(e)}'})

def handle_google_callback(query_params):
    """
    HANDLE GOOGLE OAUTH CALLBACK
    
    Processes the authorization code returned by Google/Cognito and exchanges it
    for JWT access, ID, and refresh tokens. Sets secure httpOnly cookies.
    
    CALLBACK FLOW:
    1. Extract authorization code from query parameters
    2. Exchange code for tokens via Cognito OAuth token endpoint
    3. Create secure httpOnly cookies with tokens
    4. Redirect user to dashboard with authentication complete
    
    ERROR HANDLING:
    - Invalid/expired authorization code → Redirect to signin with error
    - Network/API errors → Show error page
    - Missing parameters → Validation error response
    """
    try:
        # Extract authorization code
        auth_code = query_params.get('code')
        if not auth_code:
            error_msg = query_params.get('error', 'Authorization code not provided')
            return redirect_with_error(error_msg)
        
        # Get Cognito configuration
        user_pool_id = os.environ['COGNITO_USER_POOL_ID']
        client_id = os.environ['COGNITO_CLIENT_ID']
        domain = os.environ.get('COGNITO_DOMAIN', f"{os.environ['PROJECT_NAME']}-{os.environ['ENVIRONMENT']}-auth")
        
        # Exchange authorization code for tokens
        # AWS_REGION is automatically set by Lambda runtime
        token_url = f"https://{domain}.auth.{os.environ['AWS_REGION']}.amazoncognito.com/oauth2/token"
        
        token_data = {
            'grant_type': 'authorization_code',
            'client_id': client_id,
            'code': auth_code,
            'redirect_uri': f"https://{os.environ.get('API_DOMAIN', 'api.filodelight.online')}/auth/google/callback"
        }
        
        # Make token exchange request
        token_request = urllib.request.Request(
            token_url,
            data=urllib.parse.urlencode(token_data).encode(),
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )
        
        with urllib.request.urlopen(token_request) as response:
            token_response = json.loads(response.read().decode())
        
        # Extract tokens
        access_token = token_response.get('access_token')
        id_token = token_response.get('id_token')
        refresh_token = token_response.get('refresh_token')
        expires_in = token_response.get('expires_in', 3600)
        
        if not all([access_token, id_token]):
            return redirect_with_error('Failed to obtain authentication tokens')
        
        # Create secure httpOnly cookies
        cookies = [
            create_cookie('accessToken', access_token, max_age_seconds=expires_in, http_only=True),
            create_cookie('idToken', id_token, max_age_seconds=expires_in, http_only=True)
        ]
        
        # Add refresh token cookie if available
        if refresh_token:
            cookies.append(create_cookie('refreshToken', refresh_token, max_age_seconds=30*24*60*60, http_only=True))  # 30 days
        
        # Redirect to dashboard with success
        frontend_domain = os.environ.get('FRONTEND_DOMAIN', 'filodelight.online')
        
        return {
            'statusCode': 302,
            'headers': {
                'Location': f"https://{frontend_domain}/dashboard",
                'Content-Type': 'text/html'
            },
            'multiValueHeaders': {
                'Set-Cookie': cookies
            },
            'body': f'<html><body>Google Sign In successful! Redirecting to dashboard...<script>window.location.href="https://{frontend_domain}/dashboard";</script></body></html>'
        }
        
    except urllib.error.HTTPError as e:
        error_data = json.loads(e.read().decode()) if e.code == 400 else {}
        error_msg = error_data.get('error_description', 'OAuth token exchange failed')
        return redirect_with_error(f'Google authentication failed: {error_msg}')
    except Exception as e:
        return redirect_with_error(f'Authentication error: {str(e)}')

def redirect_with_error(error_message):
    """
    Redirect to signin page with error message in URL params
    Frontend will display the error to the user
    """
    frontend_domain = os.environ.get('FRONTEND_DOMAIN', 'filodelight.online')
    error_encoded = urllib.parse.quote(error_message)
    
    return {
        'statusCode': 302,
        'headers': {
            'Location': f"https://{frontend_domain}/signin?error={error_encoded}",
            'Content-Type': 'text/html'
        },
        'body': f'<html><body>Redirecting with error...<script>window.location.href="https://{frontend_domain}/signin?error={error_encoded}";</script></body></html>'
    }