import json
import boto3
import os
from datetime import datetime, timezone
from botocore.exceptions import ClientError
from utils import (
    create_response, get_cors_headers, 
    extract_jwt_from_cookies, validate_and_decode_token,
    create_error_response
)

# Initialize AWS services
dynamodb = boto3.resource('dynamodb')
employees_table = dynamodb.Table(os.environ['EMPLOYEES_TABLE'])

def lambda_handler(event, context):
    """
    Delete an employee record for the authenticated user
    
    Path Parameters:
    - employeeId: The ID of the employee to delete
    
    Query Parameters (optional):
    - soft: Set to 'true' for soft delete (mark as inactive instead of removing)
    """
    try:
        # Extract and validate JWT token from cookies
        token = extract_jwt_from_cookies(event.get('headers', {}))
        if not token:
            return create_error_response(401, "Authentication required")
        
        # Decode and validate the JWT token
        decoded_token = validate_and_decode_token(token)
        if not decoded_token:
            return create_error_response(401, "Invalid or expired token")
        
        # Get user ID from token
        user_id = decoded_token.get('sub')
        if not user_id:
            return create_error_response(401, "Invalid token: missing user ID")
        
        # Get employee ID from path parameters
        path_params = event.get('pathParameters') or {}
        employee_id = path_params.get('employeeId')
        if not employee_id:
            return create_error_response(400, "Employee ID is required")
        
        # Check if this is a soft delete
        query_params = event.get('queryStringParameters') or {}
        soft_delete = query_params.get('soft', '').lower() == 'true'
        
        try:
            # First, verify the employee exists and belongs to the user
            existing_employee = employees_table.get_item(
                Key={
                    'userId': user_id,
                    'employeeId': employee_id
                }
            )
            
            if 'Item' not in existing_employee:
                return create_error_response(404, "Employee not found")
            
            employee_data = existing_employee['Item']
            
            if soft_delete:
                # Soft delete: Mark as inactive and add deletion metadata
                current_time = datetime.now(timezone.utc).isoformat()
                
                employees_table.update_item(
                    Key={
                        'userId': user_id,
                        'employeeId': employee_id
                    },
                    UpdateExpression='SET #status = :status, #updatedAt = :updatedAt, #deletedAt = :deletedAt, #deletedBy = :deletedBy',
                    ExpressionAttributeNames={
                        '#status': 'status',
                        '#updatedAt': 'updatedAt',
                        '#deletedAt': 'deletedAt',
                        '#deletedBy': 'deletedBy'
                    },
                    ExpressionAttributeValues={
                        ':status': 'inactive',
                        ':updatedAt': current_time,
                        ':deletedAt': current_time,
                        ':deletedBy': user_id
                    },
                    ConditionExpression='attribute_exists(userId) AND attribute_exists(employeeId)'
                )
                
                return create_response(200, {
                    'message': 'Employee deactivated successfully',
                    'employeeId': employee_id,
                    'action': 'soft_delete',
                    'deletedAt': current_time
                }, get_cors_headers())
            
            else:
                # Hard delete: Remove the record completely
                employees_table.delete_item(
                    Key={
                        'userId': user_id,
                        'employeeId': employee_id
                    },
                    ConditionExpression='attribute_exists(userId) AND attribute_exists(employeeId)'
                )
                
                return create_response(200, {
                    'message': 'Employee deleted successfully',
                    'employeeId': employee_id,
                    'action': 'hard_delete',
                    'deletedEmployee': {
                        'firstName': employee_data.get('firstName'),
                        'lastName': employee_data.get('lastName'),
                        'email': employee_data.get('email'),
                        'department': employee_data.get('department'),
                        'position': employee_data.get('position')
                    }
                }, get_cors_headers())
        
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'ConditionalCheckFailedException':
                return create_error_response(404, "Employee not found")
            else:
                print(f"DynamoDB error deleting employee: {str(e)}")
                return create_error_response(500, "Error deleting employee")
        
        except Exception as e:
            print(f"Error deleting employee: {str(e)}")
            return create_error_response(500, "Error deleting employee")
        
    except Exception as e:
        print(f"Error in employee delete handler: {str(e)}")
        return create_error_response(500, "Internal server error")