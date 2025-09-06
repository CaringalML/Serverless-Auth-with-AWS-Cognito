# Archive Lambda Layer with source code tracking
data "archive_file" "lambda_layer" {
  type        = "zip"
  source_dir  = "${path.module}/lambda_functions/shared"
  output_path = "${path.module}/lambda_functions/shared/lambda_layer.zip"

  # This ensures the archive is only recreated when source files change
  excludes = ["__pycache__", "*.pyc", "*.pyo", ".DS_Store", "Thumbs.db", "*.zip"]
}

resource "aws_lambda_layer_version" "shared" {
  filename            = data.archive_file.lambda_layer.output_path
  layer_name          = "${var.project_name}-${var.environment}-shared"
  compatible_runtimes = ["python3.12"]

  # This hash ensures the layer is only updated when the source code changes
  source_code_hash = data.archive_file.lambda_layer.output_base64sha256
}

locals {
  lambda_functions = {
    signup = {
      handler     = "signup.lambda_handler"
      timeout     = 10
      memory_size = 128 # No KMS encryption
    }
    signin = {
      handler     = "signin.lambda_handler"
      timeout     = 20
      memory_size = 512 # KMS encryption - more CPU/memory for better performance
    }
    verify = {
      handler     = "verify.lambda_handler"
      timeout     = 10
      memory_size = 128 # No KMS encryption
    }
    forgot_password = {
      handler     = "forgot_password.lambda_handler"
      timeout     = 10
      memory_size = 128 # No KMS encryption
    }
    reset_password = {
      handler     = "reset_password.lambda_handler"
      timeout     = 10
      memory_size = 128 # No KMS encryption
    }
    resend_verification = {
      handler     = "resend_verification.lambda_handler"
      timeout     = 10
      memory_size = 128 # No KMS encryption
    }
    refresh = {
      handler     = "refresh.lambda_handler"
      timeout     = 20
      memory_size = 384 # KMS encryption - moderate memory for 2 tokens
    }
    logout = {
      handler     = "logout.lambda_handler"
      timeout     = 10
      memory_size = 128 # No KMS encryption
    }
    verify_token = {
      handler     = "verify_token.lambda_handler"
      timeout     = 10
      memory_size = 128 # No KMS encryption
    }
    user_info = {
      handler     = "user_info.lambda_handler"
      timeout     = 10
      memory_size = 128 # No KMS encryption
    }
    google_auth = {
      handler     = "google_auth.lambda_handler"
      timeout     = 25
      memory_size = 512 # KMS encryption - more CPU/memory for better performance
    }
  }
}

# Custom message Lambda function for Cognito triggers
resource "aws_lambda_function" "custom_message" {
  filename      = data.archive_file.custom_message.output_path
  function_name = "${var.project_name}-${var.environment}-custom-message"
  role          = aws_iam_role.lambda_role.arn
  handler       = "custom_message.lambda_handler"
  runtime       = "python3.12"
  timeout       = 10
  memory_size   = 128

  source_code_hash = data.archive_file.custom_message.output_base64sha256

  layers = [aws_lambda_layer_version.shared.arn]

  environment {
    variables = {
      PROJECT_NAME = var.project_name
      ENVIRONMENT  = var.environment
    }
  }

  # Lifecycle management for efficient updates
  lifecycle {
    prevent_destroy       = false
    create_before_destroy = false
    ignore_changes = [
      # Ignore changes to these fields to prevent unnecessary updates
      last_modified,
      qualified_arn,
      version
    ]
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# Archive for custom message Lambda
data "archive_file" "custom_message" {
  type        = "zip"
  source_dir  = "${path.module}/lambda_functions/custom_message"
  output_path = "${path.module}/lambda_functions/custom_message/custom_message.zip"

  # This ensures the archive is only recreated when source files change
  excludes = ["__pycache__", "*.pyc", "*.pyo", ".DS_Store", "Thumbs.db"]
}

# Lambda permission for Cognito to invoke custom message function
resource "aws_lambda_permission" "cognito_custom_message" {
  statement_id  = "AllowExecutionFromCognito"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.custom_message.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}

# Archive Lambda functions with source code tracking
data "archive_file" "lambda_functions" {
  for_each = local.lambda_functions

  type        = "zip"
  source_dir  = "${path.module}/lambda_functions/${each.key}"
  output_path = "${path.module}/lambda_functions/${each.key}/${each.key}.zip"

  # This ensures the archive is only recreated when source files change
  excludes = ["__pycache__", "*.pyc", "*.pyo", ".DS_Store", "Thumbs.db", "*.zip"]
}


resource "aws_lambda_function" "auth_functions" {
  for_each = local.lambda_functions

  filename      = data.archive_file.lambda_functions[each.key].output_path
  function_name = "${var.project_name}-${var.environment}-${replace(each.key, "_", "-")}"
  role          = aws_iam_role.lambda_role.arn
  handler       = each.value.handler
  runtime       = "python3.12"
  timeout       = each.value.timeout
  memory_size   = each.value.memory_size

  # This hash ensures Lambda only updates when the source code changes
  source_code_hash = data.archive_file.lambda_functions[each.key].output_base64sha256

  layers = [aws_lambda_layer_version.shared.arn]

  environment {
    variables = {
      COGNITO_CLIENT_ID      = aws_cognito_user_pool_client.main.id
      COGNITO_USER_POOL_ID   = aws_cognito_user_pool.main.id
      USERS_TABLE            = aws_dynamodb_table.users.name
      TOKEN_CACHE_TABLE      = aws_dynamodb_table.token_cache.name
      CORS_ALLOW_ORIGIN      = var.cors_allow_origin
      CORS_ALLOW_HEADERS     = var.cors_allow_headers
      CORS_ALLOW_METHODS     = var.cors_allow_methods
      CORS_ALLOW_CREDENTIALS = var.cors_allow_credentials
      PROJECT_NAME           = var.project_name
      ENVIRONMENT            = var.environment
      COGNITO_DOMAIN         = aws_cognito_user_pool_domain.main.domain
      API_DOMAIN             = "${var.api_subdomain}.${var.root_domain}"
      FRONTEND_DOMAIN        = var.root_domain
      GOOGLE_CLIENT_ID       = var.google_client_id
      GOOGLE_CLIENT_SECRET   = var.google_client_secret
      TURNSTILE_SECRET_KEY   = var.turnstile_secret_key
      # KMS Configuration for military-grade token encryption
      KMS_TOKEN_KEY_ID       = aws_kms_key.auth_tokens.id
      KMS_ENCRYPTION_ENABLED = var.kms_encryption_enabled
      KMS_ROLLOUT_PERCENTAGE = var.kms_rollout_percentage
    }
  }

  # Lifecycle management for efficient updates
  lifecycle {
    create_before_destroy = false
    ignore_changes = [
      # Ignore changes to these fields to prevent unnecessary updates
      last_modified,
      qualified_arn,
      version
    ]
  }

  depends_on = [
    aws_iam_role.lambda_role,
    data.archive_file.lambda_functions,
    aws_lambda_layer_version.shared
  ]
}

resource "aws_lambda_permission" "api_gateway" {
  for_each = local.lambda_functions

  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth_functions[each.key].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}