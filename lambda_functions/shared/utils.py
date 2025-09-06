import json
import boto3
import base64
import os
import time
import logging
from botocore.exceptions import ClientError
from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple

logger = logging.getLogger()
logger.setLevel(logging.INFO)

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

def create_cookie(name, value, max_age_seconds=None, http_only=True, secure=True, same_site='Strict'):
    """
    Create secure httpOnly cookie with enterprise-grade security settings
    
    SECURITY IMPLEMENTATION:
    - HttpOnly: Prevents XSS attacks by blocking JavaScript access to tokens
    - Secure: Ensures cookies only transmitted over HTTPS connections
    - SameSite=Strict: Maximum CSRF protection (same-domain requests only)
    - Path=/: Cookie available to all routes on the domain
    - Max-Age + Expires: Dual expiration for browser compatibility
    
    ARCHITECTURE:
    Frontend domain: filodelight.online 
    API domain: api.filodelight.online
    Same root domain enables secure cookie sharing with Strict policy
    
    Args:
        name: Cookie name (accessToken, idToken, refreshToken)
        value: JWT token value from AWS Cognito
        max_age_seconds: Cookie lifetime in seconds
        http_only: Prevent JavaScript access (True for security)
        secure: Only send over HTTPS (True for production)
        same_site: CSRF protection ('Strict' for maximum security)
    
    Returns:
        str: Formatted cookie string with security attributes
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


# ====================================================================
# KMS TOKEN ENCRYPTION - MILITARY-GRADE AES-256
# ====================================================================

class KMSTokenEncryption:
    """
    Handles encryption and decryption of JWT tokens using AWS KMS.
    Provides military-grade AES-256 encryption for defense-in-depth security.
    """
    
    def __init__(self):
        """Initialize KMS client and configuration."""
        self.kms_client = boto3.client('kms')
        self.kms_key_id = os.environ.get('KMS_TOKEN_KEY_ID')
        self.environment = os.environ.get('ENVIRONMENT', 'dev')
        self.kms_enabled = os.environ.get('KMS_ENCRYPTION_ENABLED', 'false').lower() == 'true'
        
        if self.kms_enabled and not self.kms_key_id:
            raise ValueError("KMS_TOKEN_KEY_ID environment variable is required when KMS is enabled")
    
    def create_encryption_context(self, token_type: str, user_id: Optional[str] = None) -> Dict[str, str]:
        """Create encryption context for additional security validation."""
        context = {
            'purpose': 'auth_token',
            'environment': self.environment,
            'token_type': token_type,
            'timestamp': str(int(time.time()))
        }
        
        if user_id:
            context['user_id'] = user_id
        
        return context
    
    def encrypt_token(self, token: str, token_type: str = 'access', user_id: Optional[str] = None) -> str:
        """
        Encrypt a JWT token using KMS with AES-256.
        
        Args:
            token: The JWT token to encrypt
            token_type: Type of token (access, id, refresh)
            user_id: Optional user ID for context
            
        Returns:
            Base64-encoded encrypted token safe for cookie storage
        """
        if not self.kms_enabled:
            return token  # Return unencrypted if KMS not enabled
        
        try:
            encryption_context = self.create_encryption_context(token_type, user_id)
            
            logger.info(f"Encrypting {token_type} token with KMS")
            
            response = self.kms_client.encrypt(
                KeyId=self.kms_key_id,
                Plaintext=token.encode('utf-8'),
                EncryptionContext=encryption_context
            )
            
            encrypted_token = base64.b64encode(response['CiphertextBlob']).decode('utf-8')
            logger.info(f"Successfully encrypted {token_type} token")
            
            return encrypted_token
            
        except ClientError as e:
            logger.error(f"KMS encryption failed: {str(e)}")
            # Fallback to unencrypted token if KMS fails
            return token
    
    def decrypt_token(self, encrypted_token: str, expected_token_type: str = 'access') -> Optional[str]:
        """
        Decrypt a KMS-encrypted token from a cookie.
        
        Args:
            encrypted_token: Base64-encoded encrypted token
            expected_token_type: Expected token type for validation
            
        Returns:
            Decrypted JWT token or original token if not encrypted
        """
        if not self.kms_enabled:
            return encrypted_token  # Return as-is if KMS not enabled
        
        try:
            # Try to decode as base64 - if it fails, it's not encrypted
            try:
                ciphertext = base64.b64decode(encrypted_token)
            except:
                # Not base64 encoded, likely an unencrypted token
                return encrypted_token
            
            encryption_context = {
                'purpose': 'auth_token',
                'environment': self.environment,
                'token_type': expected_token_type
            }
            
            logger.info(f"Attempting to decrypt {expected_token_type} token")
            
            response = self.kms_client.decrypt(
                CiphertextBlob=ciphertext,
                EncryptionContext=encryption_context
            )
            
            decrypted_token = response['Plaintext'].decode('utf-8')
            logger.info(f"Successfully decrypted {expected_token_type} token")
            
            return decrypted_token
            
        except ClientError as e:
            logger.error(f"KMS decryption failed: {str(e)}")
            # Return original token if decryption fails (might be unencrypted)
            return encrypted_token


# Singleton instance for KMS encryption
_kms_encryption = None

def get_kms_encryption() -> KMSTokenEncryption:
    """Get or create singleton KMS encryption instance."""
    global _kms_encryption
    if _kms_encryption is None:
        _kms_encryption = KMSTokenEncryption()
    return _kms_encryption


def create_encrypted_cookie(name: str, token: str, token_type: str = 'access', 
                          user_id: Optional[str] = None, max_age_seconds: Optional[int] = None) -> str:
    """
    Create httpOnly cookie with optional KMS encryption.
    
    Provides double-layer security:
    1. HttpOnly protection (XSS immunity)
    2. KMS AES-256 encryption (if enabled)
    
    Args:
        name: Cookie name
        token: JWT token to encrypt and store
        token_type: Type of token (access, id, refresh)
        user_id: Optional user ID for encryption context
        max_age_seconds: Cookie lifetime
        
    Returns:
        Secure cookie string with optionally encrypted token
    """
    kms = get_kms_encryption()
    
    # Encrypt token if KMS is enabled
    if kms.kms_enabled:
        encrypted_token = kms.encrypt_token(token, token_type, user_id)
        return create_cookie(name, encrypted_token, max_age_seconds, http_only=True)
    else:
        # Standard httpOnly cookie without encryption
        return create_cookie(name, token, max_age_seconds, http_only=True)


def extract_and_decrypt_token_from_cookie(cookies_header: str, cookie_name: str) -> Optional[str]:
    """
    Extract and optionally decrypt a token from httpOnly cookie.
    
    Args:
        cookies_header: Cookie header string from request
        cookie_name: Name of the cookie to extract
        
    Returns:
        Decrypted JWT token or None if not found/invalid
    """
    if not cookies_header:
        return None
    
    # Parse cookies to find the requested one
    for cookie in cookies_header.split(';'):
        cookie = cookie.strip()
        if cookie.startswith(f"{cookie_name}="):
            token_value = cookie.split('=', 1)[1]
            
            # Map cookie names to token types
            token_type_map = {
                'accessToken': 'access',
                'idToken': 'id',
                'refreshToken': 'refresh'
            }
            token_type = token_type_map.get(cookie_name, 'access')
            
            # Decrypt if KMS is enabled
            kms = get_kms_encryption()
            if kms.kms_enabled:
                return kms.decrypt_token(token_value, token_type)
            else:
                return token_value
    
    return None


def decode_token_payload(token: str) -> Optional[Dict]:
    """Decode JWT token payload without verification (for non-sensitive data)."""
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        
        payload = parts[1]
        # Add padding if needed
        padding = len(payload) % 4
        if padding:
            payload += '=' * (4 - padding)
        
        decoded_bytes = base64.urlsafe_b64decode(payload)
        decoded_str = decoded_bytes.decode('utf-8')
        return json.loads(decoded_str)
    except Exception:
        return None


def should_use_kms_encryption() -> bool:
    """
    Determine if KMS encryption should be used.
    Allows for gradual rollout via environment variables.
    """
    kms_enabled = os.environ.get('KMS_ENCRYPTION_ENABLED', 'false').lower() == 'true'
    rollout_percentage = int(os.environ.get('KMS_ROLLOUT_PERCENTAGE', '0'))
    
    if kms_enabled:
        return True
    elif rollout_percentage > 0:
        # Simple percentage-based rollout
        import random
        return random.randint(1, 100) <= rollout_percentage
    
    return False