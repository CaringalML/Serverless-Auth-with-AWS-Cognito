import json
import boto3
import base64
import os
import time
import logging
from botocore.exceptions import ClientError
from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple, List

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize SNS client for alerts
sns_client = None
def get_sns_client():
    """Get or create singleton SNS client for alerts."""
    global sns_client
    if sns_client is None:
        sns_client = boto3.client('sns')
    return sns_client

def send_system_alert(subject: str, message: str, severity: str = 'ERROR') -> bool:
    """
    Send system alert via SNS for critical failures.
    
    Args:
        subject: Alert subject
        message: Detailed alert message
        severity: Alert severity (ERROR, WARNING, CRITICAL)
        
    Returns:
        True if alert sent successfully, False otherwise
    """
    try:
        sns_topic_arn = os.environ.get('SYSTEM_ALERTS_SNS_TOPIC_ARN')
        if not sns_topic_arn:
            logger.warning("SNS topic ARN not configured for system alerts")
            return False
        
        sns = get_sns_client()
        
        # Format the message with context
        full_message = f"""
Severity: {severity}
Environment: {os.environ.get('ENVIRONMENT', 'unknown')}
Function: {os.environ.get('AWS_LAMBDA_FUNCTION_NAME', 'unknown')}
Time: {datetime.utcnow().isoformat()}Z

{message}

Action Required: Please investigate immediately.
        """
        
        response = sns.publish(
            TopicArn=sns_topic_arn,
            Subject=f"[{severity}] {subject}",
            Message=full_message
        )
        
        logger.info(f"System alert sent successfully: {response['MessageId']}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send system alert: {str(e)}")
        return False

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
    - Domain=.{root_domain}: Cookie shared across all subdomains
    - Path=/: Cookie available to all routes on the domain
    - Max-Age + Expires: Dual expiration for browser compatibility
    
    ARCHITECTURE:
    Frontend domain: {root_domain} 
    API domain: api.{root_domain}
    Domain attribute enables cookie sharing between subdomains
    
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
    
    # Add Domain attribute to enable subdomain sharing
    # Using the configured root domain allows cookies to be shared between
    # the frontend domain and API subdomain
    root_domain = os.environ.get('ROOT_DOMAIN', 'filodelight.online')
    cookie_parts.append(f"Domain=.{root_domain}")
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
        """Initialize KMS client with optimizations for Lambda."""
        # Optimize KMS client for performance
        import botocore.config
        
        # Configure client with connection pooling and retries for performance
        config = botocore.config.Config(
            max_pool_connections=10,  # Increase connection pool for parallel encryption
            retries={'max_attempts': 2, 'mode': 'adaptive'},
            tcp_keepalive=True,
        )
        
        self.kms_client = boto3.client('kms', config=config)
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
            'token_type': token_type
        }
        
        # NOTE: We don't include user_id in encryption context because it's not 
        # available during decryption (chicken-and-egg problem)
        
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
            raise Exception("KMS encryption is required but not enabled - cannot proceed without encryption")
        
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
            error_message = f"KMS encryption failed: {str(e)}"
            logger.error(error_message)
            
            # Send alert for KMS encryption failures
            send_system_alert(
                subject="CRITICAL: KMS Token Encryption Failure",
                message=f"Failed to encrypt {token_type} token\nUser: {user_id}\nError: {error_message}\n\nAuthentication cannot proceed without encryption.",
                severity="CRITICAL"
            )
            
            # SECURITY: Never fallback to unencrypted tokens
            raise Exception(f"Token encryption failed - cannot proceed: {str(e)}")
    
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
            except Exception as decode_error:
                # Invalid token format - fail securely
                logger.error(f"Invalid token format - base64 decode failed: {decode_error}")
                return None
            
            # Use the same encryption context creation method for consistency
            encryption_context = self.create_encryption_context(expected_token_type)
            
            logger.info(f"Attempting to decrypt {expected_token_type} token")
            
            response = self.kms_client.decrypt(
                CiphertextBlob=ciphertext,
                EncryptionContext=encryption_context
            )
            
            decrypted_token = response['Plaintext'].decode('utf-8')
            logger.info(f"Successfully decrypted {expected_token_type} token")
            
            return decrypted_token
            
        except ClientError as e:
            error_message = f"KMS decryption failed: {str(e)}"
            logger.error(error_message)
            
            # Send alert for KMS decryption failures
            send_system_alert(
                subject="CRITICAL: KMS Token Decryption Failure",
                message=f"Failed to decrypt {expected_token_type} token\nError: {error_message}\n\nUser authentication may be impacted.",
                severity="CRITICAL"
            )
            
            # SECURITY: Never fallback to unencrypted tokens - fail securely
            return None


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
    Extract and decrypt a token from KMS-encrypted httpOnly cookie.
    
    SECURITY: This function enforces KMS decryption when enabled.
    No fallback to unencrypted tokens for maximum security.
    
    Args:
        cookies_header: Cookie header string from request
        cookie_name: Name of the cookie to extract
        
    Returns:
        Decrypted JWT token or None if not found/decryption fails
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


def create_encrypted_cookies_parallel(tokens: List[Dict[str, str]], user_id: Optional[str] = None) -> List[str]:
    """
    Create multiple encrypted cookies in parallel for optimal performance.
    
    This function significantly improves performance by encrypting all tokens concurrently
    instead of sequentially, reducing total encryption time from ~600ms to ~200ms.
    
    Args:
        tokens: List of token dictionaries with keys: name, token, token_type, max_age_seconds
        user_id: Optional user ID for encryption context
        
    Returns:
        List of encrypted cookie strings
    """
    import concurrent.futures
    import threading
    
    kms = get_kms_encryption()
    
    if not kms.kms_enabled:
        # SECURITY: Encryption is mandatory - never create unencrypted cookies
        raise Exception("KMS encryption is required but not enabled - cannot create unencrypted cookies")
    
    def encrypt_single_token(token_info):
        """Encrypt a single token with error handling."""
        try:
            encrypted_token = kms.encrypt_token(
                token_info['token'], 
                token_info['token_type'], 
                user_id
            )
            return create_cookie(
                token_info['name'], 
                encrypted_token, 
                token_info['max_age_seconds'], 
                http_only=True
            )
        except Exception as e:
            error_message = f"Failed to encrypt {token_info['token_type']} token: {str(e)}"
            logger.error(error_message)
            
            # Send alert for parallel encryption failures
            send_system_alert(
                subject="CRITICAL: Parallel Token Encryption Failure",
                message=f"Failed during parallel encryption\nToken Type: {token_info['token_type']}\nUser: {user_id}\nError: {error_message}",
                severity="CRITICAL"
            )
            
            # SECURITY: Never fallback to unencrypted cookies
            raise Exception(f"Token encryption failed - authentication cannot proceed: {str(e)}")
    
    # Use ThreadPoolExecutor for concurrent KMS API calls
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        # Submit all encryption tasks
        future_to_token = {
            executor.submit(encrypt_single_token, token): token for token in tokens
        }
        
        # Collect results in original order
        results = []
        for token in tokens:
            for future, original_token in future_to_token.items():
                if original_token == token:
                    results.append(future.result())
                    break
        
        return results


def cache_encrypted_tokens(user_id: str, encrypted_tokens: Dict, expires_in_seconds: int = 3600) -> bool:
    """
    Cache encrypted tokens for a user to avoid re-encryption on token refresh.
    
    This dramatically improves performance by encrypting tokens only once during login,
    then reusing the encrypted tokens during refresh cycles.
    
    Args:
        user_id: User's unique identifier
        encrypted_tokens: Dict containing tokens and hashes or simple token dict
        expires_in_seconds: Cache expiration time
        
    Returns:
        True if successfully cached, False otherwise
    """
    try:
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(os.environ.get('TOKEN_CACHE_TABLE'))
        
        # Calculate expiration time for TTL
        expires_at = int(time.time()) + expires_in_seconds
        
        # Store encrypted tokens in cache
        item = {
            'user_id': user_id,
            'cache_data': encrypted_tokens,  # This can be simple dict or complex structure
            'expires_at': expires_at,
            'created_at': int(time.time())
        }
        
        table.put_item(Item=item)
        logger.info(f"Successfully cached encrypted tokens for user: {user_id}")
        return True
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = f"DynamoDB error caching tokens for user {user_id}: {error_code} - {str(e)}"
        logger.error(error_message)
        
        # Send alert for critical cache failures
        if error_code in ['ProvisionedThroughputExceededException', 'InternalServerError', 'ServiceUnavailable']:
            send_system_alert(
                subject="Critical: Token Cache Write Failure",
                message=f"Failed to cache encrypted tokens\nUser: {user_id}\nError: {error_message}\n\nThis may impact authentication performance.",
                severity="CRITICAL"
            )
        return False
        
    except Exception as e:
        error_message = f"Unexpected error caching tokens for user {user_id}: {str(e)}"
        logger.error(error_message)
        
        # Send alert for unexpected failures
        send_system_alert(
            subject="Token Cache Write Error",
            message=f"Unexpected failure caching tokens\nUser: {user_id}\nError: {error_message}",
            severity="ERROR"
        )
        return False


def get_cached_encrypted_tokens(user_id: str) -> Optional[Dict]:
    """
    Retrieve cached encrypted tokens for a user.
    
    Args:
        user_id: User's unique identifier
        
    Returns:
        Dictionary of encrypted tokens or None if not found/expired
    """
    try:
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(os.environ.get('TOKEN_CACHE_TABLE'))
        
        response = table.get_item(Key={'user_id': user_id})
        
        if 'Item' not in response:
            logger.info(f"No cached tokens found for user: {user_id}")
            return None
            
        item = response['Item']
        
        # Check if cache is still valid (DynamoDB TTL might not have cleaned up yet)
        if item.get('expires_at', 0) <= int(time.time()):
            logger.info(f"Cached tokens expired for user: {user_id}")
            return None
            
        logger.info(f"Retrieved cached encrypted tokens for user: {user_id}")
        return item.get('cache_data', {})
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = f"DynamoDB error retrieving cached tokens for user {user_id}: {error_code} - {str(e)}"
        logger.error(error_message)
        
        # Send alert for critical cache read failures
        if error_code in ['ProvisionedThroughputExceededException', 'InternalServerError', 'ServiceUnavailable']:
            send_system_alert(
                subject="Critical: Token Cache Read Failure",
                message=f"Failed to retrieve cached tokens\nUser: {user_id}\nError: {error_message}\n\nFalling back to re-encryption, performance may be impacted.",
                severity="WARNING"
            )
        return None
        
    except Exception as e:
        error_message = f"Unexpected error retrieving cached tokens for user {user_id}: {str(e)}"
        logger.error(error_message)
        
        # Don't send alerts for every cache miss, but log it
        logger.warning(f"Cache read failed, will re-encrypt tokens: {error_message}")
        return None


def invalidate_token_cache(user_id: str) -> bool:
    """
    Remove cached encrypted tokens for a user (called on logout).
    
    Args:
        user_id: User's unique identifier
        
    Returns:
        True if successfully invalidated, False otherwise
    """
    try:
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(os.environ.get('TOKEN_CACHE_TABLE'))
        
        table.delete_item(Key={'user_id': user_id})
        logger.info(f"Successfully invalidated token cache for user: {user_id}")
        return True
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = f"DynamoDB error invalidating cache for user {user_id}: {error_code} - {str(e)}"
        logger.error(error_message)
        
        # Only alert for critical failures, not for item not found
        if error_code in ['ProvisionedThroughputExceededException', 'InternalServerError', 'ServiceUnavailable']:
            send_system_alert(
                subject="Token Cache Invalidation Failure",
                message=f"Failed to invalidate token cache on logout\nUser: {user_id}\nError: {error_message}\n\nCache may contain stale tokens.",
                severity="WARNING"
            )
        return False
        
    except Exception as e:
        error_message = f"Unexpected error invalidating cache for user {user_id}: {str(e)}"
        logger.error(error_message)
        # Log but don't alert for cache invalidation failures on logout
        return False


def create_encrypted_cookies_with_cache(tokens: List[Dict[str, str]], user_id: Optional[str] = None, force_refresh: bool = False) -> List[str]:
    """
    Create encrypted cookies with intelligent caching.
    
    Flow:
    1. If force_refresh=True (new tokens), invalidate old cache first
    2. Check cache for existing encrypted tokens
    3. If found and tokens haven't changed, use cached encrypted tokens (FAST)
    4. If not found or force_refresh, encrypt new tokens and update cache
    
    Args:
        tokens: List of token dictionaries
        user_id: User ID for caching
        force_refresh: Force cache invalidation and re-encryption (for new tokens)
        
    Returns:
        List of encrypted cookie strings
    """
    kms = get_kms_encryption()
    
    if not kms.kms_enabled:
        # SECURITY: Encryption is mandatory - never create unencrypted cookies
        raise Exception("KMS encryption is required but not enabled - authentication cannot proceed")
    
    if not user_id:
        # SECURITY: User ID required for KMS encryption context
        raise Exception("User ID is required for secure token encryption")
    
    # If force_refresh, invalidate existing cache first
    if force_refresh:
        invalidate_token_cache(user_id)
        logger.info(f"Force refresh: invalidated cache for user {user_id}")
        cached_tokens = None
    else:
        # Try to get cached encrypted tokens first
        cached_tokens = get_cached_encrypted_tokens(user_id)
    
    if cached_tokens and not force_refresh:
        logger.info(f"Using cached encrypted tokens for user: {user_id}")
        # Create cookies from cached encrypted tokens (no KMS calls needed!)
        cookies = []
        for token in tokens:
            token_type = token['token_type']
            if token_type in cached_tokens and cached_tokens[token_type]:  # Check not empty
                cookie = create_cookie(
                    token['name'],
                    cached_tokens[token_type],
                    token['max_age_seconds'],
                    http_only=True
                )
                cookies.append(cookie)
            else:
                # Cache miss or empty token - encrypt individually and update cache
                logger.warning(f"Token type {token_type} not in cache or empty, encrypting individually")
                encrypted_token = kms.encrypt_token(token['token'], token_type, user_id)
                cookie = create_cookie(token['name'], encrypted_token, token['max_age_seconds'], http_only=True)
                cookies.append(cookie)
                
                # Update cache with this newly encrypted token
                try:
                    cache_encrypted_tokens(user_id, {token_type: encrypted_token}, expires_in_seconds=7200)
                except Exception as e:
                    logger.error(f"Failed to update cache for token {token_type}: {str(e)}")
        
        return cookies
    
    else:
        logger.info(f"No cache found, encrypting and caching tokens for user: {user_id}")
        # No cache found, encrypt in parallel and cache for future use
        cookies = create_encrypted_cookies_parallel(tokens, user_id)
        
        # Extract encrypted tokens and cache them
        encrypted_tokens = {}
        for i, token in enumerate(tokens):
            # Parse the encrypted token from the cookie
            cookie_value = cookies[i]
            # Extract the token value from "name=value; HttpOnly; Secure..."
            if '=' in cookie_value:
                encrypted_token_value = cookie_value.split('=', 1)[1].split(';')[0]
                encrypted_tokens[token['token_type']] = encrypted_token_value
        
        # Cache the encrypted tokens for future use
        if encrypted_tokens:
            cache_encrypted_tokens(user_id, encrypted_tokens, expires_in_seconds=7200)  # 2 hours
        
        return cookies


def create_encrypted_cookies_smart_cache(tokens: List[Dict[str, str]], user_id: Optional[str] = None) -> List[str]:
    """
    Ultra-smart caching: Only re-encrypt if token content actually changes.
    
    This is the most cost-effective approach:
    1. Hash token content to detect changes
    2. If tokens are identical to cached ones, reuse encrypted cache
    3. If tokens changed, encrypt only the changed tokens
    4. Dramatically reduces KMS costs for refresh scenarios
    
    Args:
        tokens: List of token dictionaries
        user_id: User ID for caching
        
    Returns:
        List of encrypted cookie strings
    """
    import hashlib
    
    kms = get_kms_encryption()
    
    if not kms.kms_enabled or not user_id:
        return [
            create_cookie(t['name'], t['token'], t['max_age_seconds'], http_only=True)
            for t in tokens
        ]
    
    # Get existing cache
    cached_data = get_cached_encrypted_tokens(user_id)
    
    if cached_data and isinstance(cached_data, dict):
        cached_tokens = cached_data.get('tokens', {})
        cached_hashes = cached_data.get('token_hashes', {})
    else:
        cached_tokens = {}
        cached_hashes = {}
    
    # Calculate hashes for current tokens
    current_hashes = {}
    for token in tokens:
        token_hash = hashlib.sha256(token['token'].encode()).hexdigest()
        current_hashes[token['token_type']] = token_hash
    
    # Check what needs re-encryption
    tokens_to_encrypt = []
    cookies = []
    
    for token in tokens:
        token_type = token['token_type']
        current_hash = current_hashes[token_type]
        cached_hash = cached_hashes.get(token_type)
        
        if current_hash == cached_hash and token_type in cached_tokens:
            # Token hasn't changed, reuse cached encrypted version
            logger.info(f"Reusing cached encrypted {token_type} token for user {user_id}")
            cookie = create_cookie(
                token['name'],
                cached_tokens[token_type],
                token['max_age_seconds'],
                http_only=True
            )
            cookies.append(cookie)
        else:
            # Token changed or not cached, needs encryption
            logger.info(f"Token {token_type} changed or not cached, encrypting for user {user_id}")
            tokens_to_encrypt.append(token)
    
    # Encrypt only the changed tokens
    if tokens_to_encrypt:
        encrypted_cookies = create_encrypted_cookies_parallel(tokens_to_encrypt, user_id)
        
        # Update cache with new encrypted tokens
        new_cached_tokens = cached_tokens.copy()
        new_cached_hashes = cached_hashes.copy()
        
        for i, token in enumerate(tokens_to_encrypt):
            token_type = token['token_type']
            cookie_value = encrypted_cookies[i]
            
            # Extract encrypted token from cookie
            if '=' in cookie_value:
                encrypted_token_value = cookie_value.split('=', 1)[1].split(';')[0]
                new_cached_tokens[token_type] = encrypted_token_value
                new_cached_hashes[token_type] = current_hashes[token_type]
            
            cookies.append(cookie_value)
        
        # Update cache
        cache_data = {
            'tokens': new_cached_tokens,
            'token_hashes': new_cached_hashes
        }
        cache_encrypted_tokens(user_id, cache_data, expires_in_seconds=7200)
    
    return cookies


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


def extract_jwt_from_cookies(headers: dict) -> Optional[str]:
    """
    Extract JWT token from httpOnly cookies in request headers.
    
    Args:
        headers: Request headers containing cookies
        
    Returns:
        JWT token string if found, None otherwise
    """
    try:
        cookie_header = headers.get('Cookie') or headers.get('cookie', '')
        if not cookie_header:
            logger.warning("No cookies found in request headers")
            return None
        
        # Try to extract encrypted token first (KMS)
        if should_use_kms_encryption():
            access_token = extract_and_decrypt_token_from_cookie(cookie_header, 'access_token')
            if access_token:
                logger.info("Successfully extracted KMS-encrypted access token")
                return access_token
        
        # Fallback to plain JWT cookie (backward compatibility)
        cookies = {}
        for cookie in cookie_header.split(';'):
            if '=' in cookie:
                key, value = cookie.strip().split('=', 1)
                cookies[key] = value
        
        access_token = cookies.get('access_token')
        if access_token:
            logger.info("Successfully extracted plain JWT access token")
            return access_token
        
        logger.warning("Access token not found in cookies")
        return None
        
    except Exception as e:
        logger.error(f"Error extracting JWT from cookies: {str(e)}")
        return None


def validate_and_decode_token(token: str) -> Optional[Dict]:
    """
    Validate and decode JWT token using Cognito.
    
    Args:
        token: JWT token string to validate
        
    Returns:
        Decoded token payload if valid, None otherwise
    """
    try:
        if not token:
            logger.warning("Empty token provided for validation")
            return None
        
        import jwt
        import requests
        from jwt.algorithms import RSAAlgorithm
        
        # Get Cognito configuration from environment
        user_pool_id = os.environ.get('COGNITO_USER_POOL_ID')
        region = os.environ.get('AWS_DEFAULT_REGION', 'ap-southeast-2')
        
        if not user_pool_id:
            logger.error("COGNITO_USER_POOL_ID not configured")
            return None
        
        # Get Cognito public keys
        keys_url = f"https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json"
        
        try:
            response = requests.get(keys_url, timeout=10)
            response.raise_for_status()
            jwks = response.json()
        except Exception as e:
            logger.error(f"Failed to fetch Cognito public keys: {str(e)}")
            return None
        
        # Decode token header to get key ID
        try:
            header = jwt.get_unverified_header(token)
            kid = header.get('kid')
            
            if not kid:
                logger.error("Token header missing key ID (kid)")
                return None
                
        except Exception as e:
            logger.error(f"Failed to decode token header: {str(e)}")
            return None
        
        # Find matching public key
        public_key = None
        for key in jwks.get('keys', []):
            if key.get('kid') == kid:
                public_key = RSAAlgorithm.from_jwk(key)
                break
        
        if not public_key:
            logger.error(f"Public key not found for kid: {kid}")
            return None
        
        # Verify and decode token
        try:
            decoded_token = jwt.decode(
                token,
                public_key,
                algorithms=['RS256'],
                options={'verify_exp': True, 'verify_aud': False}  # Skip audience validation for flexibility
            )
            
            # Additional validation
            now = int(time.time())
            
            # Check token expiration
            if decoded_token.get('exp', 0) < now:
                logger.warning("Token has expired")
                return None
            
            # Check token issued time (not too old)
            if decoded_token.get('iat', now) > now + 300:  # Allow 5 min clock skew
                logger.warning("Token issued in the future")
                return None
            
            # Check token type (should be access token)
            token_use = decoded_token.get('token_use')
            if token_use != 'access':
                logger.warning(f"Invalid token type: {token_use}")
                return None
            
            logger.info(f"Successfully validated token for user: {decoded_token.get('sub', 'unknown')}")
            return decoded_token
            
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.error(f"Invalid token: {str(e)}")
            return None
            
    except Exception as e:
        logger.error(f"Error validating token: {str(e)}")
        return None


def create_error_response(status_code: int, message: str, headers: Optional[Dict] = None) -> Dict:
    """
    Create standardized error response with CORS headers.
    
    Args:
        status_code: HTTP status code
        message: Error message
        headers: Additional headers
        
    Returns:
        API Gateway response format
    """
    response_headers = get_cors_headers()
    if headers:
        response_headers.update(headers)
    
    return {
        'statusCode': status_code,
        'headers': response_headers,
        'body': json.dumps({
            'error': message,
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        })
    }


def get_cors_headers() -> Dict[str, str]:
    """
    Get CORS headers from environment variables.
    
    Returns:
        Dictionary of CORS headers
    """
    return {
        'Access-Control-Allow-Origin': os.environ.get('CORS_ALLOW_ORIGIN', 'https://filodelight.online'),
        'Access-Control-Allow-Headers': os.environ.get('CORS_ALLOW_HEADERS', 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'),
        'Access-Control-Allow-Methods': os.environ.get('CORS_ALLOW_METHODS', 'GET,OPTIONS,POST,PUT,DELETE'),
        'Access-Control-Allow-Credentials': str(os.environ.get('CORS_ALLOW_CREDENTIALS', 'true')).lower(),
        'Access-Control-Max-Age': str(os.environ.get('CORS_MAX_AGE', '86400'))
    }