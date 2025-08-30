# CloudWatch Log Group for API Gateway Access Logs
resource "aws_cloudwatch_log_group" "api_gateway_logs" {
  count = var.api_gateway_logging_enabled ? 1 : 0

  name              = "/aws/apigateway/${var.project_name}-${var.environment}-api"
  retention_in_days = 14
  skip_destroy      = false

  tags = {
    Name        = "${var.project_name}-${var.environment}-api-logs"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.project_name}-${var.environment}-api"
  description = var.api_gateway_description

  endpoint_configuration {
    types = [var.api_gateway_endpoint_type]
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-api"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_api_gateway_resource" "auth" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "auth"
}

locals {
  api_endpoints = {
    signup = {
      path_part = "signup"
      method    = "POST"
    }
    signin = {
      path_part = "signin"
      method    = "POST"
    }
    verify = {
      path_part = "verify"
      method    = "POST"
    }
    forgot_password = {
      path_part = "forgot-password"
      method    = "POST"
    }
    reset_password = {
      path_part = "reset-password"
      method    = "POST"
    }
    resend_verification = {
      path_part = "resend-verification"
      method    = "POST"
    }
    refresh = {
      path_part = "refresh"
      method    = "POST"
    }
  }
}

resource "aws_api_gateway_resource" "endpoints" {
  for_each = local.api_endpoints

  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.auth.id
  path_part   = each.value.path_part
}

resource "aws_api_gateway_method" "endpoints" {
  for_each = local.api_endpoints

  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.endpoints[each.key].id
  http_method   = each.value.method
  authorization = "NONE"
}

resource "aws_api_gateway_method" "options" {
  for_each = local.api_endpoints

  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.endpoints[each.key].id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "lambda" {
  for_each = local.api_endpoints

  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.endpoints[each.key].id
  http_method = aws_api_gateway_method.endpoints[each.key].http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.auth_functions[each.key].invoke_arn
}

resource "aws_api_gateway_integration" "options" {
  for_each = local.api_endpoints

  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.endpoints[each.key].id
  http_method = aws_api_gateway_method.options[each.key].http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

resource "aws_api_gateway_method_response" "options" {
  for_each = local.api_endpoints

  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.endpoints[each.key].id
  http_method = aws_api_gateway_method.options[each.key].http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true
    "method.response.header.Access-Control-Allow-Methods"     = true
    "method.response.header.Access-Control-Allow-Origin"      = true
    "method.response.header.Access-Control-Allow-Credentials" = true
    "method.response.header.Access-Control-Max-Age"           = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "options" {
  for_each = local.api_endpoints

  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.endpoints[each.key].id
  http_method = aws_api_gateway_method.options[each.key].http_method
  status_code = aws_api_gateway_method_response.options[each.key].status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'${var.cors_allow_headers}'"
    "method.response.header.Access-Control-Allow-Methods"     = "'${var.cors_allow_methods}'"
    "method.response.header.Access-Control-Allow-Origin"      = "'${var.cors_allow_origin}'"
    "method.response.header.Access-Control-Allow-Credentials" = "'${var.cors_allow_credentials}'"
    "method.response.header.Access-Control-Max-Age"           = "'${var.cors_max_age}'"
  }

  depends_on = [
    aws_api_gateway_integration.options
  ]
}

resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.auth,
      aws_api_gateway_resource.endpoints,
      aws_api_gateway_method.endpoints,
      aws_api_gateway_method.options,
      aws_api_gateway_integration.lambda,
      aws_api_gateway_integration.options,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_method.endpoints,
    aws_api_gateway_integration.lambda,
    aws_api_gateway_method.options,
    aws_api_gateway_integration.options
  ]
}

resource "aws_api_gateway_stage" "main" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = var.api_stage_name != null ? var.api_stage_name : var.environment
  description   = var.api_stage_description

  # Enable detailed CloudWatch metrics
  xray_tracing_enabled = var.api_gateway_data_trace_enabled

  # Access logging configuration
  dynamic "access_log_settings" {
    for_each = var.api_gateway_logging_enabled ? [1] : []
    content {
      destination_arn = aws_cloudwatch_log_group.api_gateway_logs[0].arn
      format = jsonencode({
        requestId      = "$context.requestId"
        ip             = "$context.identity.sourceIp"
        caller         = "$context.identity.caller"
        user           = "$context.identity.user"
        requestTime    = "$context.requestTime"
        httpMethod     = "$context.httpMethod"
        resourcePath   = "$context.resourcePath"
        status         = "$context.status"
        protocol       = "$context.protocol"
        responseLength = "$context.responseLength"
        error          = "$context.error.message"
        errorType      = "$context.error.messageString"
      })
    }
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-api-stage"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Method settings for logging and monitoring
resource "aws_api_gateway_method_settings" "all" {
  count = var.api_gateway_logging_enabled ? 1 : 0

  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  method_path = "*/*"

  settings {
    # Enable CloudWatch logging
    logging_level      = var.api_gateway_log_level
    data_trace_enabled = var.api_gateway_data_trace_enabled
    metrics_enabled    = var.api_gateway_metrics_enabled

    # Throttling settings
    throttling_rate_limit  = var.api_throttle_rate_limit
    throttling_burst_limit = var.api_throttle_burst_limit
  }
}