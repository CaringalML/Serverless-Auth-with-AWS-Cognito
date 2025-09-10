import json
import boto3
import os
from datetime import datetime, timezone
from botocore.exceptions import ClientError
from utils import (
    create_response, parse_body, get_cors_headers, 
    extract_jwt_from_cookies, validate_and_decode_token,
    create_error_response
)

# Initialize AWS services
dynamodb = boto3.resource('dynamodb')
employees_table = dynamodb.Table(os.environ['EMPLOYEES_TABLE'])

def lambda_handler(event, context):
    """
    Update an existing employee record for the authenticated user
    
    Path Parameters:
    - employeeId: The ID of the employee to update
    
    Request Body (partial update supported):
    {
        "firstName": "John",
        "lastName": "Doe", 
        "email": "john.doe@company.com",
        "department": "Engineering",
        "position": "Senior Software Developer",
        "salary": 85000,
        "status": "active",
        "phone": "+1234567890",
        "address": "123 Main St",
        "notes": "Updated notes"
    }
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
        
        # Parse request body
        body = parse_body(event)
        if not body:
            return create_error_response(400, "Request body is required")
        
        # Remove fields that shouldn't be updated
        forbidden_fields = ['userId', 'employeeId', 'createdAt', 'createdBy']
        for field in forbidden_fields:
            if field in body:
                del body[field]
        
        # Validate email format if provided
        if 'email' in body:
            email = body['email']
            if '@' not in email or '.' not in email:
                return create_error_response(400, "Invalid email format")
            body['email'] = email.lower().strip()
        
        # Clean string fields
        string_fields = ['firstName', 'lastName', 'department', 'position', 'phone', 'address', 'notes']
        for field in string_fields:
            if field in body and isinstance(body[field], str):
                body[field] = body[field].strip()
        
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
            
            # Check if email is being changed and if it conflicts with another employee
            if 'email' in body:
                new_email = body['email']
                current_email = existing_employee['Item']['email']
                
                if new_email != current_email:
                    # Query all employees for this user to check email uniqueness
                    response = employees_table.query(
                        KeyConditionExpression=boto3.dynamodb.conditions.Key('userId').eq(user_id)
                    )
                    
                    for emp in response.get('Items', []):
                        if emp['employeeId'] != employee_id and emp['email'] == new_email:
                            return create_error_response(400, "Another employee already uses this email")
            
            # Prepare update expression
            update_expression_parts = []
            expression_attribute_names = {}
            expression_attribute_values = {}
            
            # Add updatedAt timestamp
            body['updatedAt'] = datetime.now(timezone.utc).isoformat()
            
            # Build update expression dynamically
            for key, value in body.items():
                # Handle reserved keywords by using expression attribute names
                attr_name = f"#{key}"
                attr_value = f":{key}"
                
                update_expression_parts.append(f"{attr_name} = {attr_value}")
                expression_attribute_names[attr_name] = key
                expression_attribute_values[attr_value] = value
            
            update_expression = "SET " + ", ".join(update_expression_parts)
            
            # Update the employee record
            response = employees_table.update_item(
                Key={
                    'userId': user_id,
                    'employeeId': employee_id
                },
                UpdateExpression=update_expression,
                ExpressionAttributeNames=expression_attribute_names,
                ExpressionAttributeValues=expression_attribute_values,
                ReturnValues='ALL_NEW',
                ConditionExpression='attribute_exists(userId) AND attribute_exists(employeeId)'
            )
            
            updated_employee = response['Attributes']
            
            return create_response(200, {
                'message': 'Employee updated successfully',
                'employee': updated_employee
            }, get_cors_headers())
        
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'ConditionalCheckFailedException':
                return create_error_response(404, "Employee not found")
            else:
                print(f"DynamoDB error updating employee: {str(e)}")
                return create_error_response(500, "Error updating employee")
        
        except Exception as e:
            print(f"Error updating employee: {str(e)}")
            return create_error_response(500, "Error updating employee")
        
    except Exception as e:
        print(f"Error in employee update handler: {str(e)}")
        return create_error_response(500, "Internal server error")