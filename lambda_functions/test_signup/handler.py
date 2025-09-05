import json
import sys
import os

def lambda_handler(event, context):
    try:
        print("Starting test lambda handler")
        
        # Test basic imports
        print("Testing basic imports...")
        import boto3
        from botocore.exceptions import ClientError
        print("✅ boto3 imports work")
        
        # Test sys.path
        print(f"sys.path: {sys.path}")
        
        # Test layer imports
        sys.path.append('/opt')
        print("Added /opt to sys.path")
        
        # Test utils import
        try:
            from utils import create_response, parse_body
            print("✅ utils import works")
        except Exception as e:
            print(f"❌ utils import failed: {e}")
        
        # Test recaptcha import
        try:
            from recaptcha import verify_recaptcha, get_recaptcha_error_response
            print("✅ recaptcha import works")
        except Exception as e:
            print(f"❌ recaptcha import failed: {e}")
            
        # Test environment variables
        print(f"RECAPTCHA_SECRET_KEY present: {'RECAPTCHA_SECRET_KEY' in os.environ}")
        print(f"RECAPTCHA_THRESHOLD: {os.environ.get('RECAPTCHA_THRESHOLD', 'not set')}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Test successful'})
        }
        
    except Exception as e:
        print(f"Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }