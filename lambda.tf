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
  }
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

resource "aws_iam_role" "lambda_role" {
  name = "${var.project_name}-${var.environment}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_policy" {
  name = "${var.project_name}-${var.environment}-lambda-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:SignUp",
          "cognito-idp:ConfirmSignUp",
          "cognito-idp:InitiateAuth",
          "cognito-idp:ForgotPassword",
          "cognito-idp:ConfirmForgotPassword",
          "cognito-idp:GetUser"
        ]
        Resource = aws_cognito_user_pool.main.arn
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.users.arn,
          "${aws_dynamodb_table.users.arn}/index/*"
        ]
      }
    ]
  })
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
      COGNITO_CLIENT_ID    = aws_cognito_user_pool_client.main.id
      COGNITO_USER_POOL_ID = aws_cognito_user_pool.main.id
      USERS_TABLE          = aws_dynamodb_table.users.name
    }
  }

  depends_on = [
    aws_iam_role_policy.lambda_policy,
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