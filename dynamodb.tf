resource "aws_dynamodb_table" "users" {
  name           = "${var.project_name}-${var.environment}-users"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "userId"

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

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}