# Archive Lambda Layer with source code tracking
data "archive_file" "lambda_layer" {
  type        = "zip"
  source_dir  = "${path.module}/lambda_functions/shared"
  output_path = "${path.module}/lambda_functions/shared/lambda_layer.zip"

  # This ensures the archive is only recreated when source files change
  excludes = ["__pycache__", "*.pyc"]
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
      handler = "handler.lambda_handler"
      timeout = 10
    }
    signin = {
      handler = "handler.lambda_handler"
      timeout = 10
    }
    verify = {
      handler = "handler.lambda_handler"
      timeout = 10
    }
    forgot_password = {
      handler = "handler.lambda_handler"
      timeout = 10
    }
    reset_password = {
      handler = "handler.lambda_handler"
      timeout = 10
    }
    resend_verification = {
      handler = "handler.lambda_handler"
      timeout = 10
    }
    refresh = {
      handler = "handler.lambda_handler"
      timeout = 10
    }
  }
}

# Custom message Lambda function for Cognito triggers
resource "aws_lambda_function" "custom_message" {
  filename      = "lambda_functions/custom_message/custom_message.zip"
  function_name = "${var.project_name}-${var.environment}-custom-message"
  role          = aws_iam_role.lambda_role.arn
  handler       = "handler.lambda_handler"
  runtime       = "python3.12"
  timeout       = 10
  memory_size   = 128

  source_code_hash = data.archive_file.custom_message_lambda.output_base64sha256

  layers = [aws_lambda_layer_version.shared.arn]

  environment {
    variables = {
      PROJECT_NAME = var.project_name
      ENVIRONMENT  = var.environment
    }
  }

  lifecycle {
    prevent_destroy = false
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# Archive for custom message Lambda
data "archive_file" "custom_message_lambda" {
  type        = "zip"
  source_dir  = "lambda_functions/custom_message"
  output_path = "lambda_functions/custom_message/custom_message.zip"
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
  output_path = "${path.module}/lambda_functions/${each.key}/${each.key}_lambda.zip"

  # This ensures the archive is only recreated when source files change
  excludes = ["__pycache__", "*.pyc"]
}


resource "aws_lambda_function" "auth_functions" {
  for_each = local.lambda_functions

  filename      = data.archive_file.lambda_functions[each.key].output_path
  function_name = "${var.project_name}-${var.environment}-${replace(each.key, "_", "-")}"
  role          = aws_iam_role.lambda_role.arn
  handler       = each.value.handler
  runtime       = "python3.12"
  timeout       = each.value.timeout
  memory_size   = 128

  # This hash ensures Lambda only updates when the source code changes
  source_code_hash = data.archive_file.lambda_functions[each.key].output_base64sha256

  layers = [aws_lambda_layer_version.shared.arn]

  environment {
    variables = {
      COGNITO_CLIENT_ID      = aws_cognito_user_pool_client.main.id
      COGNITO_USER_POOL_ID   = aws_cognito_user_pool.main.id
      USERS_TABLE            = aws_dynamodb_table.users.name
      CORS_ALLOW_ORIGIN      = var.cors_allow_origin
      CORS_ALLOW_HEADERS     = var.cors_allow_headers
      CORS_ALLOW_METHODS     = var.cors_allow_methods
      CORS_ALLOW_CREDENTIALS = var.cors_allow_credentials
      PROJECT_NAME           = var.project_name
      ENVIRONMENT            = var.environment
    }
  }

  depends_on = [
    aws_iam_role.lambda_role,
    data.archive_file.lambda_functions
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