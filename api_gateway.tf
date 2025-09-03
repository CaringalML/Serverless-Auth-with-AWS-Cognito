# CloudWatch Log Group for API Gateway Access Logs
resource "aws_cloudwatch_log_group" "api_gateway_logs" {
  count = var.api_gateway_logging_enabled ? 1 : 0

  name              = "/aws/apigateway/${var.project_name}-${var.environment}-api"
  retention_in_days = 14
  skip_destroy      = var.skip_destroy_cloudwatch_logs

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
    logout = {
      path_part = "logout"
      method    = "POST"
    }
    verify_token = {
      path_part = "verify-token"
      method    = "GET"
    }
    user_info = {
      path_part = "user-info"
      method    = "GET"
    }
  }
}

# Google OAuth endpoints require special handling (multiple methods)
resource "aws_api_gateway_resource" "google" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.auth.id
  path_part   = "google"
}

resource "aws_api_gateway_resource" "google_callback" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.google.id
  path_part   = "callback"
}

# GET /auth/google - Initiate Google OAuth
resource "aws_api_gateway_method" "google_login" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.google.id
  http_method   = "GET"
  authorization = "NONE"
}

# GET /auth/google/callback - Handle OAuth callback
resource "aws_api_gateway_method" "google_callback" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.google_callback.id
  http_method   = "GET"
  authorization = "NONE"
}

# Lambda integrations for Google OAuth
resource "aws_api_gateway_integration" "google_login" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.google.id
  http_method = aws_api_gateway_method.google_login.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.auth_functions["google_auth"].invoke_arn
}

resource "aws_api_gateway_integration" "google_callback" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.google_callback.id
  http_method = aws_api_gateway_method.google_callback.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.auth_functions["google_auth"].invoke_arn
}

# OPTIONS methods for CORS support
resource "aws_api_gateway_method" "google_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.google.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "google_callback_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.google_callback.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# OPTIONS integrations for CORS
resource "aws_api_gateway_integration" "google_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.google.id
  http_method = aws_api_gateway_method.google_options.http_method

  type = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_integration" "google_callback_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.google_callback.id
  http_method = aws_api_gateway_method.google_callback_options.http_method

  type = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# Method responses for OPTIONS
resource "aws_api_gateway_method_response" "google_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.google.id
  http_method = aws_api_gateway_method.google_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_method_response" "google_callback_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.google_callback.id
  http_method = aws_api_gateway_method.google_callback_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# Integration responses for OPTIONS
resource "aws_api_gateway_integration_response" "google_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.google.id
  http_method = aws_api_gateway_method.google_options.http_method
  status_code = aws_api_gateway_method_response.google_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'${var.cors_allow_headers}'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${var.cors_allow_origin}'"
  }
}

resource "aws_api_gateway_integration_response" "google_callback_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.google_callback.id
  http_method = aws_api_gateway_method.google_callback_options.http_method
  status_code = aws_api_gateway_method_response.google_callback_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'${var.cors_allow_headers}'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${var.cors_allow_origin}'"
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
      # Google OAuth resources
      aws_api_gateway_resource.google,
      aws_api_gateway_resource.google_callback,
      aws_api_gateway_method.google_login,
      aws_api_gateway_method.google_callback,
      aws_api_gateway_method.google_options,
      aws_api_gateway_method.google_callback_options,
      aws_api_gateway_integration.google_login,
      aws_api_gateway_integration.google_callback,
      aws_api_gateway_integration.google_options,
      aws_api_gateway_integration.google_callback_options,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_method.endpoints,
    aws_api_gateway_integration.lambda,
    aws_api_gateway_method.options,
    aws_api_gateway_integration.options,
    # Google OAuth dependencies
    aws_api_gateway_method.google_login,
    aws_api_gateway_method.google_callback,
    aws_api_gateway_method.google_options,
    aws_api_gateway_method.google_callback_options,
    aws_api_gateway_integration.google_login,
    aws_api_gateway_integration.google_callback,
    aws_api_gateway_integration.google_options,
    aws_api_gateway_integration.google_callback_options,
    aws_api_gateway_integration_response.google_options,
    aws_api_gateway_integration_response.google_callback_options,
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

    # Default throttling settings (higher limits for general endpoints)
    throttling_rate_limit  = var.api_throttle_rate_limit
    throttling_burst_limit = var.api_throttle_burst_limit
  }
}

# ====================================================================
# RATE LIMITING FOR AUTHENTICATION ENDPOINTS
# ====================================================================
# Implement strict rate limiting on sensitive auth endpoints to prevent
# brute force attacks, credential stuffing, and abuse

# Sign In endpoint - Most restrictive (prevent brute force)
resource "aws_api_gateway_method_settings" "signin_rate_limit" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  method_path = "auth/signin/POST"

  settings {
    throttling_rate_limit  = 5    # 5 requests per second max
    throttling_burst_limit = 10   # Allow brief burst of 10 requests
    
    logging_level      = "ERROR"
    metrics_enabled    = true
    data_trace_enabled = false    # Don't log passwords
  }
}

# Sign Up endpoint - Prevent automated account creation
resource "aws_api_gateway_method_settings" "signup_rate_limit" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  method_path = "auth/signup/POST"

  settings {
    throttling_rate_limit  = 2    # 2 requests per second max
    throttling_burst_limit = 5    # Allow brief burst of 5 requests
    
    logging_level      = "ERROR"
    metrics_enabled    = true
    data_trace_enabled = false
  }
}

# Forgot Password - Prevent email bombing
resource "aws_api_gateway_method_settings" "forgot_password_rate_limit" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  method_path = "auth/forgot-password/POST"

  settings {
    throttling_rate_limit  = 1    # 1 request per second max
    throttling_burst_limit = 3    # Allow brief burst of 3 requests
    
    logging_level      = "ERROR"
    metrics_enabled    = true
    data_trace_enabled = false
  }
}

# Reset Password - Prevent brute forcing reset codes
resource "aws_api_gateway_method_settings" "reset_password_rate_limit" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  method_path = "auth/reset-password/POST"

  settings {
    throttling_rate_limit  = 3    # 3 requests per second max
    throttling_burst_limit = 6    # Allow brief burst of 6 requests
    
    logging_level      = "ERROR"
    metrics_enabled    = true
    data_trace_enabled = false
  }
}

# Verification endpoint - Prevent code brute forcing
resource "aws_api_gateway_method_settings" "verify_rate_limit" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  method_path = "auth/verify/POST"

  settings {
    throttling_rate_limit  = 3    # 3 requests per second max
    throttling_burst_limit = 6    # Allow brief burst of 6 requests
    
    logging_level      = "ERROR"
    metrics_enabled    = true
    data_trace_enabled = false
  }
}

# Resend Verification - Prevent spam
resource "aws_api_gateway_method_settings" "resend_verification_rate_limit" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  method_path = "auth/resend-verification/POST"

  settings {
    throttling_rate_limit  = 1    # 1 request per second max
    throttling_burst_limit = 2    # Allow brief burst of 2 requests
    
    logging_level      = "ERROR"
    metrics_enabled    = true
    data_trace_enabled = false
  }
}

# Token Refresh - Slightly more lenient for authenticated users
resource "aws_api_gateway_method_settings" "refresh_rate_limit" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  method_path = "auth/refresh/POST"

  settings {
    throttling_rate_limit  = 10   # 10 requests per second max
    throttling_burst_limit = 20   # Allow brief burst of 20 requests
    
    logging_level      = "ERROR"
    metrics_enabled    = true
    data_trace_enabled = false
  }
}

# Google OAuth endpoints - Moderate limits
resource "aws_api_gateway_method_settings" "google_auth_rate_limit" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  method_path = "auth/google/GET"

  settings {
    throttling_rate_limit  = 10   # 10 requests per second max
    throttling_burst_limit = 20   # Allow brief burst of 20 requests
    
    logging_level      = "INFO"
    metrics_enabled    = true
    data_trace_enabled = false
  }
}

resource "aws_api_gateway_method_settings" "google_callback_rate_limit" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  method_path = "auth/google/callback/GET"

  settings {
    throttling_rate_limit  = 10   # 10 requests per second max
    throttling_burst_limit = 20   # Allow brief burst of 20 requests
    
    logging_level      = "INFO"
    metrics_enabled    = true
    data_trace_enabled = false
  }
}

# User Info endpoint - For authenticated users
resource "aws_api_gateway_method_settings" "user_info_rate_limit" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  method_path = "auth/user-info/GET"

  settings {
    throttling_rate_limit  = 20   # 20 requests per second max
    throttling_burst_limit = 40   # Allow brief burst of 40 requests
    
    logging_level      = "ERROR"
    metrics_enabled    = true
    data_trace_enabled = false
  }
}

# Logout endpoint
resource "aws_api_gateway_method_settings" "logout_rate_limit" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  method_path = "auth/logout/POST"

  settings {
    throttling_rate_limit  = 10   # 10 requests per second max
    throttling_burst_limit = 20   # Allow brief burst of 20 requests
    
    logging_level      = "ERROR"
    metrics_enabled    = true
    data_trace_enabled = false
  }
}

# ====================================================================
# USAGE PLAN FOR API RATE LIMITING
# ====================================================================
resource "aws_api_gateway_usage_plan" "main" {
  name        = "${var.project_name}-${var.environment}-usage-plan"
  description = "Usage plan with rate limiting and quotas for API protection"

  api_stages {
    api_id = aws_api_gateway_rest_api.main.id
    stage  = aws_api_gateway_stage.main.stage_name
  }

  # Global throttle settings for the API
  throttle_settings {
    rate_limit  = 100   # 100 requests per second globally
    burst_limit = 200   # Allow burst up to 200 requests
  }

  # Daily quota to prevent sustained abuse
  quota_settings {
    limit  = 100000  # 100k requests per day per client
    period = "DAY"
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "RateLimiting"
  }
}

# ====================================================================
# CLOUDWATCH ALARMS FOR RATE LIMIT MONITORING
# ====================================================================
# Monitor for excessive 429 (Too Many Requests) errors
resource "aws_cloudwatch_metric_alarm" "api_throttling_alarm" {
  alarm_name          = "${var.project_name}-${var.environment}-api-throttling"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "4XXError"
  namespace           = "AWS/ApiGateway"
  period              = "300"  # 5 minutes
  statistic           = "Sum"
  threshold           = "50"   # Alert if more than 50 4XX errors in 5 minutes
  alarm_description   = "Alert when API rate limiting is triggered excessively"
  treat_missing_data  = "notBreaching"
  
  dimensions = {
    ApiName = aws_api_gateway_rest_api.main.name
    Stage   = aws_api_gateway_stage.main.stage_name
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "RateLimitMonitoring"
  }
}

# Monitor for potential DDoS or abuse patterns
resource "aws_cloudwatch_metric_alarm" "api_request_spike_alarm" {
  alarm_name          = "${var.project_name}-${var.environment}-api-request-spike"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Count"
  namespace           = "AWS/ApiGateway"
  period              = "60"   # 1 minute
  statistic           = "Sum"
  threshold           = "1000" # Alert if more than 1000 requests per minute
  alarm_description   = "Alert on unusual API request spikes that might indicate an attack"
  treat_missing_data  = "notBreaching"
  
  dimensions = {
    ApiName = aws_api_gateway_rest_api.main.name
    Stage   = aws_api_gateway_stage.main.stage_name
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "DDoSMonitoring"
  }
}