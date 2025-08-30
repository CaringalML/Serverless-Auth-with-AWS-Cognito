# IAM Role for Lambda Functions
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

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# Basic Lambda Execution Policy
resource "aws_iam_policy" "lambda_basic_execution" {
  name        = "${var.project_name}-${var.environment}-lambda-basic-execution"
  path        = "/"
  description = "Basic execution policy for Lambda functions"

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
      }
    ]
  })

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# Cognito Access Policy for Lambda Functions
resource "aws_iam_policy" "lambda_cognito_access" {
  name        = "${var.project_name}-${var.environment}-lambda-cognito-access"
  path        = "/"
  description = "Policy for Lambda functions to access Cognito"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:SignUp",
          "cognito-idp:ConfirmSignUp",
          "cognito-idp:InitiateAuth",
          "cognito-idp:ForgotPassword",
          "cognito-idp:ConfirmForgotPassword",
          "cognito-idp:GetUser",
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminInitiateAuth",
          "cognito-idp:AdminConfirmSignUp",
          "cognito-idp:ListUsers"
        ]
        Resource = aws_cognito_user_pool.main.arn
      }
    ]
  })

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# DynamoDB Access Policy for Lambda Functions
resource "aws_iam_policy" "lambda_dynamodb_access" {
  name        = "${var.project_name}-${var.environment}-lambda-dynamodb-access"
  path        = "/"
  description = "Policy for Lambda functions to access DynamoDB"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          aws_dynamodb_table.users.arn,
          "${aws_dynamodb_table.users.arn}/index/*"
        ]
      }
    ]
  })

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# CloudWatch Logging Policy for Lambda Functions
resource "aws_iam_policy" "lambda_cloudwatch_logs" {
  name        = "${var.project_name}-${var.environment}-lambda-cloudwatch-logs"
  path        = "/"
  description = "Policy for Lambda functions to write to CloudWatch logs"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Resource = [
          "arn:aws:logs:*:*:log-group:/aws/lambda/${var.project_name}-${var.environment}-*",
          "arn:aws:logs:*:*:log-group:/aws/lambda/${var.project_name}-${var.environment}-*:*"
        ]
      }
    ]
  })

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# Attach Basic Execution Policy to Lambda Role
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_basic_execution.arn
}

# Attach Cognito Access Policy to Lambda Role
resource "aws_iam_role_policy_attachment" "lambda_cognito_access" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_cognito_access.arn
}

# Attach DynamoDB Access Policy to Lambda Role
resource "aws_iam_role_policy_attachment" "lambda_dynamodb_access" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_dynamodb_access.arn
}

# Attach CloudWatch Logs Policy to Lambda Role
resource "aws_iam_role_policy_attachment" "lambda_cloudwatch_logs" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_cloudwatch_logs.arn
}

# Output IAM Role ARN for reference
output "lambda_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda_role.arn
}

output "lambda_role_name" {
  description = "Name of the Lambda execution role"
  value       = aws_iam_role.lambda_role.name
}

# Data source to get current AWS account ID
data "aws_caller_identity" "current" {}

# IAM Role for CloudWatch Dashboard Access
resource "aws_iam_role" "dashboard_viewer" {
  name = "${var.project_name}-${var.environment}-dashboard-viewer"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      },
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# Policy for viewing CloudWatch dashboards and logs
resource "aws_iam_policy" "dashboard_viewer_policy" {
  name        = "${var.project_name}-${var.environment}-dashboard-viewer-policy"
  path        = "/"
  description = "Policy for viewing CloudWatch dashboards and authentication logs"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:GetDashboard",
          "cloudwatch:ListDashboards",
          "cloudwatch:GetMetricData",
          "cloudwatch:GetMetricStatistics",
          "cloudwatch:ListMetrics",
          "cloudwatch:DescribeAlarms",
          "cloudwatch:DescribeAlarmsForMetric",
          "cloudwatch:GetMetricWidgetImage"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "logs:GetLogEvents",
          "logs:FilterLogEvents",
          "logs:StartQuery",
          "logs:StopQuery",
          "logs:DescribeQueries",
          "logs:GetQueryResults"
        ]
        Resource = [
          "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.project_name}-${var.environment}-*",
          "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.project_name}-${var.environment}-*:*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "lambda:GetFunction",
          "lambda:ListFunctions"
        ]
        Resource = "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:${var.project_name}-${var.environment}-*"
      },
      {
        Effect = "Allow"
        Action = [
          "apigateway:GET"
        ]
        Resource = "arn:aws:apigateway:${var.aws_region}::/restapis/${aws_api_gateway_rest_api.main.id}/*"
      }
    ]
  })

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# Attach policy to role
resource "aws_iam_role_policy_attachment" "dashboard_viewer_policy_attachment" {
  role       = aws_iam_role.dashboard_viewer.name
  policy_arn = aws_iam_policy.dashboard_viewer_policy.arn
}

# Outputs for dashboard access
output "dashboard_viewer_role_arn" {
  description = "ARN of the dashboard viewer IAM role"
  value       = aws_iam_role.dashboard_viewer.arn
}

output "dashboard_assume_role_url" {
  description = "URL to assume the dashboard viewer role"
  value       = "https://signin.aws.amazon.com/switchrole?account=${data.aws_caller_identity.current.account_id}&roleName=${aws_iam_role.dashboard_viewer.name}&displayName=${var.project_name}-dashboard-viewer"
}