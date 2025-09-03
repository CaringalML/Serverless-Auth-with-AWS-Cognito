import json
import boto3
import os
import sys
import urllib.parse
import urllib.request
from botocore.exceptions import ClientError
from datetime import datetime, timezone
import base64
import secrets
import string

sys.path.append('/opt')
from utils import create_response, create_cookie

cognito_client = boto3.client('cognito-idp')
dynamodb = boto3.resource('dynamodb')

def generate_secure_password(length=32):
    """
    Generate a cryptographically secure random password.
    
    Uses secrets module for cryptographic randomness to ensure 
    passwords are unpredictable and unique for each user.
    
    Args:
        length: Password length (default 32 characters)
    
    Returns:
        A secure random password string
    """
    # Character sets for password generation
    lowercase = string.ascii_lowercase
    uppercase = string.ascii_uppercase
    digits = string.digits
    special = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    
    # Combine all character sets
    all_chars = lowercase + uppercase + digits + special
    
    # Ensure password has at least one character from each set
    password = [
        secrets.choice(lowercase),
        secrets.choice(uppercase),
        secrets.choice(digits),
        secrets.choice(special)
    ]
    
    # Fill the rest with random characters
    for _ in range(length - 4):
        password.append(secrets.choice(all_chars))
    
    # Shuffle the password to avoid predictable patterns
    secrets.SystemRandom().shuffle(password)
    
    return ''.join(password)

def decode_token_payload(token):
    """Decode JWT token payload (second part)"""
    try:
        # JWT tokens have 3 parts separated by dots
        parts = token.split('.')
        if len(parts) != 3:
            return None
        
        # Get the payload (middle part) and add padding if needed
        payload = parts[1]
        padding = len(payload) % 4
        if padding:
            payload += '=' * (4 - padding)
            
        decoded_bytes = base64.urlsafe_b64decode(payload)
        decoded_str = decoded_bytes.decode('utf-8')
        return json.loads(decoded_str)
    except Exception:
        return None

def create_user_record(user_info, provider='Google'):
    """Create user record in DynamoDB for Google OAuth users"""
    try:
        table = dynamodb.Table(os.environ['USERS_TABLE'])
        
        # Extract user information
        user_id = user_info.get('sub')
        email = user_info.get('email')
        name = user_info.get('name', '')
        
        if not user_id or not email:
            print(f"Missing required user info: user_id={user_id}, email={email}")
            return False
        
        # Create user record - match existing table structure
        user_record = {
            'userId': user_id,
            'email': email,
            'name': name,
            'verified': True,
            'provider': provider,
            'createdAt': datetime.now(timezone.utc).isoformat(),
            'updatedAt': datetime.now(timezone.utc).isoformat(),
            'lastLogin': datetime.now(timezone.utc).isoformat(),
            'status': 'CONFIRMED'
        }
        
        # Check if user already exists
        try:
            response = table.get_item(Key={'userId': user_id})
            if 'Item' in response:
                # User exists, update last login
                table.update_item(
                    Key={'userId': user_id},
                    UpdateExpression='SET lastLogin = :lastLogin, updatedAt = :updatedAt',
                    ExpressionAttributeValues={
                        ':lastLogin': datetime.now(timezone.utc).isoformat(),
                        ':updatedAt': datetime.now(timezone.utc).isoformat()
                    }
                )
                print(f"Updated existing user record for {email}")
                return True
        except Exception as e:
            print(f"Error checking existing user: {str(e)}")
        
        # Create new user record
        table.put_item(Item=user_record)
        print(f"Created user record for {email} with provider {provider}")
        return True
        
    except Exception as e:
        print(f"Error creating user record: {str(e)}")
        return False

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
    INITIATE DIRECT GOOGLE OAUTH FLOW
    
    Redirects user directly to Google OAuth without going through Cognito hosted UI.
    This allows us to use our custom domain in the redirect URI.
    
    DIRECT OAUTH FLOW:
    1. User clicks "Sign in with Google" 
    2. Redirect directly to Google OAuth consent
    3. Google redirects to our custom callback URL
    4. Our Lambda handles the OAuth token exchange
    5. We manually create the Cognito user and set cookies
    
    OAUTH PARAMETERS:
    - client_id: Google OAuth Client ID (from terraform.tfvars)
    - response_type: 'code' for authorization code flow
    - scope: 'openid email profile' for basic user information
    - redirect_uri: Our custom domain callback URL
    """
    try:
        # Get Google OAuth configuration from environment
        google_client_id = os.environ.get('GOOGLE_CLIENT_ID')
        if not google_client_id:
            return create_response(500, {'error': 'Google OAuth not configured'})
        
        # Build direct Google OAuth URL
        oauth_params = {
            'client_id': google_client_id,
            'response_type': 'code',
            'scope': 'openid email profile',
            'redirect_uri': f"https://{os.environ.get('API_DOMAIN', 'api.filodelight.online')}/auth/google/callback",
            'access_type': 'offline',
            'prompt': 'consent'
        }
        
        # Build complete OAuth URL - direct to Google
        oauth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(oauth_params)
        
        # Redirect directly to Google OAuth
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
    HANDLE DIRECT GOOGLE OAUTH CALLBACK
    
    Processes the authorization code returned by Google and manually creates
    a Cognito user with the Google user information. Sets secure httpOnly cookies.
    
    DIRECT CALLBACK FLOW:
    1. Extract authorization code from Google
    2. Exchange code for Google user info directly
    3. Create/update Cognito user with Google info
    4. Generate Cognito JWT tokens for the user
    5. Create secure httpOnly cookies with tokens
    6. Redirect user to dashboard
    
    ERROR HANDLING:
    - Invalid/expired authorization code → Redirect to signin with error
    - Google API errors → Show error page
    - Cognito user creation errors → Handle gracefully
    """
    try:
        # Extract authorization code
        auth_code = query_params.get('code')
        if not auth_code:
            error_msg = query_params.get('error', 'Authorization code not provided')
            return redirect_with_error(error_msg)
        
        # Get Google OAuth configuration
        google_client_id = os.environ.get('GOOGLE_CLIENT_ID')
        google_client_secret = os.environ.get('GOOGLE_CLIENT_SECRET')
        
        if not google_client_id or not google_client_secret:
            return redirect_with_error('Google OAuth not properly configured')
        
        # Exchange authorization code for Google access token
        token_url = "https://oauth2.googleapis.com/token"
        
        token_data = {
            'client_id': google_client_id,
            'client_secret': google_client_secret,
            'code': auth_code,
            'grant_type': 'authorization_code',
            'redirect_uri': f"https://{os.environ.get('API_DOMAIN', 'api.filodelight.online')}/auth/google/callback"
        }
        
        # Make token exchange request to Google
        token_request = urllib.request.Request(
            token_url,
            data=urllib.parse.urlencode(token_data).encode(),
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )
        
        with urllib.request.urlopen(token_request) as response:
            google_token_response = json.loads(response.read().decode())
        
        # Extract Google tokens
        google_access_token = google_token_response.get('access_token')
        google_id_token = google_token_response.get('id_token')
        
        if not google_access_token:
            return redirect_with_error('Failed to obtain Google access token')
        
        # Get user info from Google
        userinfo_url = f"https://www.googleapis.com/oauth2/v3/userinfo?access_token={google_access_token}"
        
        with urllib.request.urlopen(userinfo_url) as response:
            google_user_info = json.loads(response.read().decode())
        
        # Extract user information
        email = google_user_info.get('email')
        name = google_user_info.get('name', '')
        google_sub = google_user_info.get('sub')
        email_verified = google_user_info.get('email_verified', True)
        
        if not email or not google_sub:
            return redirect_with_error('Failed to obtain user information from Google')
        
        # Create or get existing user in Cognito
        user_pool_id = os.environ['COGNITO_USER_POOL_ID']
        # Use email as username since Cognito is configured for email-based usernames
        cognito_username = email
        
        # Generate secure random password for this user
        # Each Google OAuth user gets a unique, cryptographically secure password
        # This password is never exposed and only used for internal Cognito operations
        user_secure_password = generate_secure_password()
        
        # Store password temporarily in memory for auth flow
        # This ensures we can authenticate the user after creation
        cognito_user_password = None
        
        try:
            # Try to get existing user
            cognito_response = cognito_client.admin_get_user(
                UserPoolId=user_pool_id,
                Username=cognito_username
            )
            print(f"Found existing Cognito user for Google account: {email}")
            
            # For existing users, we need to retrieve or regenerate their password
            # Since we can't retrieve the original password, we'll reset it
            new_password = generate_secure_password()
            try:
                cognito_client.admin_set_user_password(
                    UserPoolId=user_pool_id,
                    Username=cognito_username,
                    Password=new_password,
                    Permanent=True
                )
                cognito_user_password = new_password
                print(f"Reset password for existing Google OAuth user: {email}")
            except Exception as reset_error:
                print(f"Error resetting password for existing user: {str(reset_error)}")
                return redirect_with_error('Failed to update user credentials')
                
        except ClientError as e:
            if e.response['Error']['Code'] == 'UserNotFoundException':
                # Create new user in Cognito with secure random passwords
                try:
                    # Generate unique temporary password for initial creation
                    temp_password = generate_secure_password(length=24)
                    
                    cognito_client.admin_create_user(
                        UserPoolId=user_pool_id,
                        Username=cognito_username,
                        UserAttributes=[
                            {'Name': 'email', 'Value': email},
                            {'Name': 'name', 'Value': name},
                            {'Name': 'email_verified', 'Value': 'true'}
                        ],
                        MessageAction='SUPPRESS',  # Don't send welcome email
                        TemporaryPassword=temp_password,  # Secure temporary password
                    )
                    
                    # Set permanent secure password (user won't use this since they use Google OAuth)
                    cognito_client.admin_set_user_password(
                        UserPoolId=user_pool_id,
                        Username=cognito_username,
                        Password=user_secure_password,  # Unique secure password for this user
                        Permanent=True
                    )
                    
                    cognito_user_password = user_secure_password
                    print(f"Created new Cognito user for Google account: {email} with secure password")
                except Exception as create_error:
                    print(f"Error creating Cognito user: {str(create_error)}")
                    return redirect_with_error('Failed to create user account')
            else:
                print(f"Error getting Cognito user: {str(e)}")
                return redirect_with_error('Error accessing user account')
        
        # Verify we have a password to use for authentication
        if not cognito_user_password:
            print("Error: No password available for Cognito authentication")
            return redirect_with_error('Authentication configuration error')
        
        # Generate Cognito JWT tokens for the user
        try:
            cognito_client_id = os.environ['COGNITO_CLIENT_ID']
            auth_response = cognito_client.admin_initiate_auth(
                UserPoolId=user_pool_id,
                ClientId=cognito_client_id,
                AuthFlow='ADMIN_NO_SRP_AUTH',
                AuthParameters={
                    'USERNAME': cognito_username,
                    'PASSWORD': cognito_user_password  # Use the secure password we generated
                }
            )
            
            # Extract Cognito JWT tokens
            auth_result = auth_response['AuthenticationResult']
            access_token = auth_result['AccessToken']
            id_token = auth_result['IdToken']
            refresh_token = auth_result.get('RefreshToken')
            expires_in = auth_result.get('ExpiresIn', 3600)
            
        except Exception as auth_error:
            print(f"Error generating Cognito tokens: {str(auth_error)}")
            return redirect_with_error('Failed to generate authentication tokens')
        
        if not all([access_token, id_token]):
            return redirect_with_error('Failed to obtain authentication tokens')
        
        # For Google OAuth users, ensure email is verified
        # Google users should automatically have verified emails
        try:
            # Get user info to check if email verification is needed
            response = cognito_client.get_user(AccessToken=access_token)
            user_attributes = {attr['Name']: attr['Value'] for attr in response.get('UserAttributes', [])}
            
            # If email is not verified, verify it (since it came from Google)
            if user_attributes.get('email_verified') != 'true':
                cognito_client.admin_set_user_attributes(
                    UserPoolId=os.environ['COGNITO_USER_POOL_ID'],
                    Username=user_attributes.get('sub') or user_attributes.get('username'),
                    UserAttributes=[
                        {
                            'Name': 'email_verified',
                            'Value': 'true'
                        }
                    ]
                )
        except Exception as e:
            # Log the error but continue - this shouldn't break the login flow
            print(f"Warning: Could not verify email for Google user: {str(e)}")
        
        # Decode ID token to get user information and create DynamoDB record
        user_info = decode_token_payload(id_token)
        if user_info:
            # Create user record in DynamoDB
            create_success = create_user_record(user_info, provider='Google')
            if not create_success:
                print("Warning: Failed to create user record in DynamoDB")
        else:
            print("Warning: Could not decode ID token for user info")
        
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
        
        print(f"Google OAuth successful for user: {user_info.get('email') if user_info else 'unknown'}")
        print(f"Setting cookies and redirecting to: https://{frontend_domain}/dashboard")
        
        return {
            'statusCode': 302,
            'headers': {
                'Location': f"https://{frontend_domain}/dashboard",
                'Content-Type': 'text/html',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            },
            'multiValueHeaders': {
                'Set-Cookie': cookies
            },
            'body': f'''<html><body>
                <h2>Google Sign In Successful!</h2>
                <p>Setting up your session...</p>
                <p>Redirecting to dashboard...</p>
                <script>
                    // Match original auth timing for httpOnly cookie processing
                    // Same timing as ProtectedRoute + checkAuthAsync (800ms + 500ms = 1.3s)
                    setTimeout(function() {{
                        window.location.href="https://{frontend_domain}/dashboard";
                    }}, 1300);
                </script>
            </body></html>'''
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