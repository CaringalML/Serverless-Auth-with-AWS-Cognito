output "api_endpoint" {
  description = "API Gateway endpoint URL (direct)"
  value       = aws_api_gateway_stage.main.invoke_url
}

output "api_custom_domain" {
  description = "API Gateway custom domain URL"
  value       = "https://source.filodelight.online"
}

output "frontend_domain" {
  description = "Frontend application domain"
  value       = "https://filodelight.online"
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  description = "Cognito Client ID"
  value       = aws_cognito_user_pool_client.main.id
}

output "dynamodb_table_name" {
  description = "DynamoDB Users table name"
  value       = aws_dynamodb_table.users.name
}

output "lambda_function_names" {
  description = "Lambda function names"
  value = {
    for k, v in aws_lambda_function.auth_functions : k => v.function_name
  }
}