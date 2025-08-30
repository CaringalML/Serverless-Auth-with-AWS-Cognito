import json
import boto3
import os
import sys
from datetime import datetime
from botocore.exceptions import ClientError

sys.path.append('/opt')
from utils import create_response, parse_body

cloudwatch_logs = boto3.client('logs')

def lambda_handler(event, context):
    try:
        body = parse_body(event)
        
        # Extract log data
        log_type = body.get('type', 'UNKNOWN')
        timestamp = body.get('timestamp', datetime.utcnow().isoformat())
        user_id = body.get('userId', 'anonymous')
        session_id = body.get('sessionId', 'unknown')
        ip_address = body.get('ipAddress', 'unknown')
        user_agent = body.get('userAgent', 'unknown')
        
        # Create CloudWatch log group name based on log type
        log_group_name = f"/aws/lambda/{os.environ.get('PROJECT_NAME', 'serverless-auth')}-{os.environ.get('ENVIRONMENT', 'dev')}-audit-{log_type.lower()}"
        
        # Create log stream name with date and session
        log_stream_name = f"{datetime.utcnow().strftime('%Y/%m/%d')}-{session_id}"
        
        # Prepare log message
        log_message = {
            'timestamp': timestamp,
            'type': log_type,
            'userId': user_id,
            'sessionId': session_id,
            'ipAddress': ip_address,
            'userAgent': user_agent,
            'details': body
        }
        
        # Ensure log group exists
        try:
            cloudwatch_logs.create_log_group(logGroupName=log_group_name)
        except ClientError as e:
            if e.response['Error']['Code'] != 'ResourceAlreadyExistsException':
                print(f"Error creating log group: {e}")
        
        # Ensure log stream exists
        try:
            cloudwatch_logs.create_log_stream(
                logGroupName=log_group_name,
                logStreamName=log_stream_name
            )
        except ClientError as e:
            if e.response['Error']['Code'] != 'ResourceAlreadyExistsException':
                print(f"Error creating log stream: {e}")
        
        # Get sequence token for log stream
        try:
            response = cloudwatch_logs.describe_log_streams(
                logGroupName=log_group_name,
                logStreamNamePrefix=log_stream_name,
                limit=1
            )
            
            sequence_token = None
            if response['logStreams'] and 'uploadSequenceToken' in response['logStreams'][0]:
                sequence_token = response['logStreams'][0]['uploadSequenceToken']
        except Exception as e:
            sequence_token = None
            print(f"Error getting sequence token: {e}")
        
        # Send log event to CloudWatch
        log_event = {
            'timestamp': int(datetime.fromisoformat(timestamp.replace('Z', '+00:00')).timestamp() * 1000),
            'message': json.dumps(log_message, default=str)
        }
        
        put_log_params = {
            'logGroupName': log_group_name,
            'logStreamName': log_stream_name,
            'logEvents': [log_event]
        }
        
        if sequence_token:
            put_log_params['sequenceToken'] = sequence_token
        
        try:
            cloudwatch_logs.put_log_events(**put_log_params)
        except ClientError as e:
            print(f"Error putting log events: {e}")
            # Don't fail the request if logging fails
        
        # Also log security events to a separate high-priority log group
        if log_type in ['SECURITY_EVENT', 'AUTH_EVENT', 'SUSPICIOUS_ACTIVITY']:
            security_log_group = f"/aws/lambda/{os.environ.get('PROJECT_NAME', 'serverless-auth')}-{os.environ.get('ENVIRONMENT', 'dev')}-security-alerts"
            
            try:
                cloudwatch_logs.create_log_group(logGroupName=security_log_group)
            except ClientError as e:
                if e.response['Error']['Code'] != 'ResourceAlreadyExistsException':
                    pass
            
            try:
                security_stream = f"security-{datetime.utcnow().strftime('%Y-%m-%d')}"
                cloudwatch_logs.create_log_stream(
                    logGroupName=security_log_group,
                    logStreamName=security_stream
                )
            except ClientError as e:
                if e.response['Error']['Code'] != 'ResourceAlreadyExistsException':
                    pass
            
            # Send to security log
            try:\n                cloudwatch_logs.put_log_events(\n                    logGroupName=security_log_group,\n                    logStreamName=security_stream,\n                    logEvents=[{\n                        'timestamp': int(datetime.fromisoformat(timestamp.replace('Z', '+00:00')).timestamp() * 1000),\n                        'message': json.dumps({\n                            'SECURITY_ALERT': True,\n                            'severity': body.get('severity', 'medium'),\n                            'event': body.get('event', 'unknown'),\n                            'userId': user_id,\n                            'ipAddress': ip_address,\n                            'timestamp': timestamp,\n                            'details': body.get('details', {})\n                        }, default=str)\n                    }]\n                )\n            except Exception as e:\n                print(f"Error logging security event: {e}")
        
        return create_response(200, {
            'message': 'Log recorded successfully',
            'logGroup': log_group_name,
            'logStream': log_stream_name
        })
        
    except Exception as e:
        print(f"Error in audit logging: {str(e)}")
        # Don't fail - logging should be non-blocking
        return create_response(200, {
            'message': 'Log processing completed with warnings',
            'error': str(e)
        })