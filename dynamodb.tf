resource "aws_dynamodb_table" "users" {
  name         = "${var.project_name}-${var.environment}-users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  global_secondary_index {
    name            = "EmailIndex"
    hash_key        = "email"
    projection_type = "ALL"
  }

  # Server-side encryption at rest for user data protection
  server_side_encryption {
    enabled = true
  }

  # Point-in-time recovery for user data protection
  point_in_time_recovery {
    enabled = true
  }

  lifecycle {
    prevent_destroy = false
  }

  deletion_protection_enabled = var.skip_destroy_dynamodb

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# DynamoDB table for encrypted token caching
resource "aws_dynamodb_table" "token_cache" {
  name         = "${var.project_name}-${var.environment}-token-cache"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "user_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  # TTL for automatic cleanup of expired tokens
  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  # Server-side encryption at rest for enhanced security
  # Uses AWS managed KMS key for DynamoDB encryption
  server_side_encryption {
    enabled = true
  }

  # Point-in-time recovery for data protection
  point_in_time_recovery {
    enabled = true
  }

  # Lifecycle management
  lifecycle {
    prevent_destroy = false
  }

  deletion_protection_enabled = var.skip_destroy_dynamodb

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "TokenCache"
    Security    = "Critical"
  }
}

# DynamoDB table for employee records
resource "aws_dynamodb_table" "employees" {
  name         = "${var.project_name}-${var.environment}-employees"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"
  range_key    = "employeeId"

  # Primary key attributes
  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "employeeId"
    type = "S"
  }

  # For querying by department within user scope
  attribute {
    name = "department"
    type = "S"
  }

  # For querying by status within user scope
  attribute {
    name = "status"
    type = "S"
  }

  # GSI for department-based queries within user scope
  global_secondary_index {
    name            = "UserDepartmentIndex"
    hash_key        = "userId"
    range_key       = "department"
    projection_type = "ALL"
  }

  # GSI for status-based queries within user scope
  global_secondary_index {
    name            = "UserStatusIndex"
    hash_key        = "userId"
    range_key       = "status"
    projection_type = "ALL"
  }

  # Server-side encryption at rest for employee data protection
  server_side_encryption {
    enabled = true
  }

  # Point-in-time recovery for data protection
  point_in_time_recovery {
    enabled = true
  }

  # Lifecycle management
  lifecycle {
    prevent_destroy = false
  }

  deletion_protection_enabled = var.skip_destroy_dynamodb

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "EmployeeData"
    Security    = "Sensitive"
  }
}