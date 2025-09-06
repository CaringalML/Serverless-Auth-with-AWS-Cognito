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