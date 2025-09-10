import json
import boto3
import os
from decimal import Decimal
from utils import (
    create_response, get_cors_headers, 
    extract_jwt_from_cookies, validate_and_decode_token,
    create_error_response
)

# Initialize AWS services
dynamodb = boto3.resource('dynamodb')
employees_table = dynamodb.Table(os.environ['EMPLOYEES_TABLE'])

def decimal_default(obj):
    """JSON serializer for Decimal objects"""
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError

def lambda_handler(event, context):
    """
    List all employees for the authenticated user with optional filtering
    
    Query Parameters:
    - department: Filter by department
    - status: Filter by status (active, inactive)
    - limit: Number of records to return (default: 50)
    - lastEvaluatedKey: For pagination
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
        
        # Get query parameters
        query_params = event.get('queryStringParameters') or {}
        department = query_params.get('department')
        status = query_params.get('status')
        limit = int(query_params.get('limit', 50))
        last_evaluated_key = query_params.get('lastEvaluatedKey')
        
        # Limit max records per request
        if limit > 100:
            limit = 100
        
        try:
            # Base query parameters
            query_kwargs = {
                'KeyConditionExpression': boto3.dynamodb.conditions.Key('userId').eq(user_id),
                'Limit': limit
            }
            
            # Handle pagination
            if last_evaluated_key:
                try:
                    query_kwargs['ExclusiveStartKey'] = json.loads(last_evaluated_key)
                except:
                    return create_error_response(400, "Invalid lastEvaluatedKey format")
            
            # Filter by department using GSI
            if department:
                response = employees_table.query(
                    IndexName='UserDepartmentIndex',
                    KeyConditionExpression=(
                        boto3.dynamodb.conditions.Key('userId').eq(user_id) &
                        boto3.dynamodb.conditions.Key('department').eq(department)
                    ),
                    Limit=limit,
                    **({'ExclusiveStartKey': query_kwargs['ExclusiveStartKey']} if 'ExclusiveStartKey' in query_kwargs else {})
                )
            
            # Filter by status using GSI  
            elif status:
                response = employees_table.query(
                    IndexName='UserStatusIndex',
                    KeyConditionExpression=(
                        boto3.dynamodb.conditions.Key('userId').eq(user_id) &
                        boto3.dynamodb.conditions.Key('status').eq(status)
                    ),
                    Limit=limit,
                    **({'ExclusiveStartKey': query_kwargs['ExclusiveStartKey']} if 'ExclusiveStartKey' in query_kwargs else {})
                )
            
            # Get all employees for user
            else:
                response = employees_table.query(**query_kwargs)
            
            employees = response.get('Items', [])
            
            # Sort employees by creation date (newest first)
            employees.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
            
            # Prepare response data
            response_data = {
                'employees': employees,
                'count': len(employees),
                'hasMore': 'LastEvaluatedKey' in response
            }
            
            # Include pagination token if there are more results
            if 'LastEvaluatedKey' in response:
                response_data['lastEvaluatedKey'] = json.dumps(
                    response['LastEvaluatedKey'], 
                    default=decimal_default
                )
            
            # Add summary statistics
            if employees:
                departments = set()
                active_count = 0
                total_salary = 0
                
                for emp in employees:
                    departments.add(emp.get('department', 'Unknown'))
                    if emp.get('status') == 'active':
                        active_count += 1
                    if emp.get('salary'):
                        total_salary += float(emp['salary'])
                
                response_data['summary'] = {
                    'totalEmployees': len(employees),
                    'activeEmployees': active_count,
                    'inactiveEmployees': len(employees) - active_count,
                    'departments': list(departments),
                    'departmentCount': len(departments),
                    'totalSalaryBudget': total_salary
                }
            else:
                response_data['summary'] = {
                    'totalEmployees': 0,
                    'activeEmployees': 0,
                    'inactiveEmployees': 0,
                    'departments': [],
                    'departmentCount': 0,
                    'totalSalaryBudget': 0
                }
            
            return create_response(200, response_data, get_cors_headers())
        
        except Exception as e:
            print(f"Error querying employees: {str(e)}")
            return create_error_response(500, "Error retrieving employees")
        
    except Exception as e:
        print(f"Error in employees list handler: {str(e)}")
        return create_error_response(500, "Internal server error")