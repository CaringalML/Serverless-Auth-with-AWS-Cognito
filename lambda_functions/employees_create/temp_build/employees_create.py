import json
import boto3
import os
import uuid
from datetime import datetime, timezone
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
    Create a new employee record for the authenticated user
    
    Request Body:
    {
        "firstName": "John",
        "lastName": "Doe", 
        "email": "john.doe@company.com",
        "department": "Engineering",
        "position": "Software Developer",
        "salary": 75000,
        "hireDate": "2024-01-15",
        "status": "active"
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
        
        # Parse request body
        body = parse_body(event)
        if not body:
            return create_error_response(400, "Request body is required")
        
        # Validate required fields
        required_fields = ['firstName', 'lastName', 'email', 'department', 'position']
        for field in required_fields:
            if not body.get(field):
                return create_error_response(400, f"Field '{field}' is required")
        
        # Validate email format (basic validation)
        email = body['email']
        if '@' not in email or '.' not in email:
            return create_error_response(400, "Invalid email format")
        
        # Generate unique employee ID
        employee_id = str(uuid.uuid4())
        current_time = datetime.now(timezone.utc).isoformat()
        
        # Prepare employee record
        employee_data = {
            'userId': user_id,  # User-specific data isolation
            'employeeId': employee_id,
            'firstName': body['firstName'].strip(),
            'lastName': body['lastName'].strip(),
            'email': email.lower().strip(),
            'department': body['department'].strip(),
            'position': body['position'].strip(),
            'salary': body.get('salary', 0),
            'hireDate': body.get('hireDate', current_time[:10]),  # Default to today
            'status': body.get('status', 'active'),
            'createdAt': current_time,
            'updatedAt': current_time,
            'createdBy': user_id
        }
        
        # Optional fields
        if body.get('phone'):
            employee_data['phone'] = body['phone'].strip()
        if body.get('address'):
            employee_data['address'] = body['address'].strip()
        if body.get('notes'):
            employee_data['notes'] = body['notes'].strip()
        
        # Check if employee email already exists for this user
        try:
            # Query by userId to get all employees for this user
            response = employees_table.query(
                KeyConditionExpression=boto3.dynamodb.conditions.Key('userId').eq(user_id)
            )
            
            # Check if email already exists
            for existing_employee in response.get('Items', []):
                if existing_employee['email'] == email:
                    return create_error_response(400, "Employee with this email already exists")
        
        except Exception as e:
            print(f"Error checking existing employee: {str(e)}")
            # Continue with creation if check fails
        
        # Save employee record to DynamoDB
        employees_table.put_item(Item=employee_data)
        
        # Return success response with created employee
        return create_response(201, {
            'message': 'Employee created successfully',
            'employee': employee_data
        }, get_cors_headers())
        
    except Exception as e:
        print(f"Error creating employee: {str(e)}")
        return create_error_response(500, "Internal server error")