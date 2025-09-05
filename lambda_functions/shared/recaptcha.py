import json
import urllib.request
import urllib.parse
import os

def verify_recaptcha(token, action='default'):
    """
    Verify Google reCAPTCHA v3 token
    
    reCAPTCHA v3 provides a score (0.0 - 1.0) where:
    - 1.0 is very likely a good interaction
    - 0.0 is very likely a bot
    
    Args:
        token: The reCAPTCHA token from the frontend
        action: The action name for this request (e.g., 'signin', 'signup')
    
    Returns:
        tuple: (is_valid, score, error_message)
    """
    try:
        # Get configuration from environment
        secret_key = os.environ.get('RECAPTCHA_SECRET_KEY')
        threshold = float(os.environ.get('RECAPTCHA_THRESHOLD', '0.5'))
        
        if not secret_key:
            # If reCAPTCHA is not configured, allow the request
            # This enables easy development and testing
            print("reCAPTCHA not configured, skipping verification")
            return (True, 1.0, None)
        
        if not token:
            return (False, 0.0, "reCAPTCHA token is required")
        
        # Verify token with Google
        url = 'https://www.google.com/recaptcha/api/siteverify'
        data = urllib.parse.urlencode({
            'secret': secret_key,
            'response': token
        }).encode()
        
        req = urllib.request.Request(url, data=data)
        response = urllib.request.urlopen(req)
        result = json.loads(response.read().decode())
        
        # Check if verification was successful
        if not result.get('success'):
            error_codes = result.get('error-codes', [])
            error_message = ', '.join(error_codes) if error_codes else 'Verification failed'
            print(f"reCAPTCHA verification failed: {error_message}")
            return (False, 0.0, error_message)
        
        # Get the score
        score = result.get('score', 0.0)
        
        # Check if the action matches (if provided)
        if action and result.get('action') != action:
            print(f"Action mismatch: expected {action}, got {result.get('action')}")
            return (False, score, "Action mismatch")
        
        # Check if score meets threshold
        is_valid = score >= threshold
        
        if not is_valid:
            print(f"reCAPTCHA score {score} below threshold {threshold}")
            return (False, score, f"Score {score} below threshold {threshold}")
        
        print(f"reCAPTCHA verification successful: score={score}, action={action}")
        return (True, score, None)
        
    except Exception as e:
        print(f"Error verifying reCAPTCHA: {str(e)}")
        # In case of error, we can choose to:
        # 1. Block the request (return False) - more secure
        # 2. Allow the request (return True) - better UX
        # Here we'll block for security
        return (False, 0.0, f"Verification error: {str(e)}")

def get_recaptcha_error_response(score=0.0, message="Bot detection failed"):
    """
    Generate a standardized error response for failed reCAPTCHA verification
    
    Args:
        score: The reCAPTCHA score received
        message: Custom error message
    
    Returns:
        dict: Error response object
    """
    return {
        'error': 'Bot detection failed',
        'message': message,
        'score': score,
        'help': 'Please ensure JavaScript is enabled and try again. If the problem persists, contact support.'
    }