import json
import urllib.request
import urllib.parse
import os

def verify_turnstile(token, remote_ip=None):
    """
    Verify Cloudflare Turnstile token
    
    Args:
        token: The Turnstile token from the client
        remote_ip: Optional client IP address for additional validation
        
    Returns:
        tuple: (success: bool, error_message: str or None)
    """
    if not token:
        return False, "Turnstile token is required"
    
    secret_key = os.environ.get('TURNSTILE_SECRET_KEY')
    if not secret_key:
        return False, "Turnstile secret key not configured"
    
    # Prepare the verification request
    verify_url = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
    
    data = {
        'secret': secret_key,
        'response': token
    }
    
    if remote_ip:
        data['remoteip'] = remote_ip
    
    try:
        # Make the verification request
        req_data = urllib.parse.urlencode(data).encode('utf-8')
        req = urllib.request.Request(verify_url, data=req_data, method='POST')
        req.add_header('Content-Type', 'application/x-www-form-urlencoded')
        
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
        
        # Check verification result
        if result.get('success'):
            return True, None
        else:
            # Extract error codes if available
            error_codes = result.get('error-codes', [])
            if error_codes:
                error_message = f"Turnstile verification failed: {', '.join(error_codes)}"
            else:
                error_message = "Turnstile verification failed"
            return False, error_message
            
    except urllib.error.URLError as e:
        return False, f"Network error during Turnstile verification: {str(e)}"
    except json.JSONDecodeError as e:
        return False, f"Invalid response from Turnstile API: {str(e)}"
    except Exception as e:
        return False, f"Unexpected error during Turnstile verification: {str(e)}"