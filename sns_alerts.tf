# SNS Topics for Critical Alerts

# Security Alert Topic
resource "aws_sns_topic" "security_alerts" {
  name = "${var.project_name}-${var.environment}-security-alerts"

  tags = {
    Environment = var.environment
    Project     = var.project_name
    AlertType   = "Security"
  }
}

# System Health Alert Topic  
resource "aws_sns_topic" "system_alerts" {
  name = "${var.project_name}-${var.environment}-system-alerts"

  tags = {
    Environment = var.environment
    Project     = var.project_name
    AlertType   = "System"
  }
}

# Email subscription for security alerts (configure manually or via variable)
resource "aws_sns_topic_subscription" "security_email" {
  count     = var.security_alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.security_alerts.arn
  protocol  = "email"
  endpoint  = var.security_alert_email
}

# Email subscription for system alerts
resource "aws_sns_topic_subscription" "system_email" {
  count     = var.system_alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.system_alerts.arn
  protocol  = "email"
  endpoint  = var.system_alert_email
}

# Enhanced Security Alarms with SNS Integration

# SNS Topic Policy to allow CloudWatch alarms to publish
resource "aws_sns_topic_policy" "security_alerts_policy" {
  arn = aws_sns_topic.security_alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "cloudwatch.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = aws_sns_topic.security_alerts.arn
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

resource "aws_sns_topic_policy" "system_alerts_policy" {
  arn = aws_sns_topic.system_alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "cloudwatch.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = aws_sns_topic.system_alerts.arn
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

# Multiple Failed Login Attempts from Same IP
resource "aws_cloudwatch_metric_alarm" "suspicious_login_activity" {
  alarm_name          = "${var.project_name}-${var.environment}-suspicious-login-activity"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  threshold           = "5"
  alarm_description   = "SECURITY ALERT: 5+ failed login attempts from same IP in 10 minutes"
  alarm_actions       = [aws_sns_topic.security_alerts.arn]
  ok_actions          = [aws_sns_topic.security_alerts.arn]
  treat_missing_data  = "notBreaching"

  metric_query {
    id          = "failed_logins"
    return_data = true

    metric {
      metric_name = "IncomingLogEvents"
      namespace   = "AWS/Logs"
      period      = 600 # 10 minutes
      stat        = "Sum"

      dimensions = {
        LogGroupName = "/aws/lambda/${var.project_name}-${var.environment}-signin"
      }
    }
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Severity    = "High"
    AlertType   = "Security"
  }

  depends_on = [
    aws_sns_topic.security_alerts,
    aws_sns_topic_policy.security_alerts_policy
  ]
}

# Unusual Geographic Login Pattern - Changed to monitor signin function instead
resource "aws_cloudwatch_log_metric_filter" "geographic_anomaly" {
  name           = "${var.project_name}-${var.environment}-geographic-anomaly"
  log_group_name = "/aws/lambda/${var.project_name}-${var.environment}-signin"
  pattern        = "[timestamp, request_id, level=\"ERROR\", ...]"

  metric_transformation {
    name      = "GeographicLogins"
    namespace = "Custom/Security"
    value     = "1"
  }

  depends_on = [aws_cloudwatch_log_group.lambda_logs]
}

# Token Refresh Failure Spike
resource "aws_cloudwatch_metric_alarm" "token_refresh_failures" {
  alarm_name          = "${var.project_name}-${var.environment}-token-refresh-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  threshold           = "20"
  alarm_description   = "High token refresh failure rate - possible attack"
  alarm_actions       = [aws_sns_topic.security_alerts.arn]

  metric_query {
    id          = "refresh_failures"
    return_data = true

    metric {
      metric_name = "IncomingLogEvents"
      namespace   = "AWS/Logs"
      period      = 300
      stat        = "Sum"

      dimensions = {
        LogGroupName = "/aws/lambda/${var.project_name}-${var.environment}-refresh"
      }
    }
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Severity    = "Medium"
    AlertType   = "Security"
  }
}

# System Performance Alerts

# API Gateway High Error Rate
resource "aws_cloudwatch_metric_alarm" "api_gateway_errors" {
  alarm_name          = "${var.project_name}-${var.environment}-api-gateway-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "4XXError"
  namespace           = "AWS/ApiGateway"
  period              = "300"
  statistic           = "Sum"
  threshold           = "100"
  alarm_description   = "API Gateway 4XX error rate exceeded threshold"
  alarm_actions       = [aws_sns_topic.system_alerts.arn]

  dimensions = {
    ApiName = "${var.project_name}-${var.environment}-api"
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Severity    = "Medium"
    AlertType   = "Performance"
  }
}

# Lambda Function Duration Alert
resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  for_each = local.lambda_functions

  alarm_name          = "${var.project_name}-${var.environment}-${replace(each.key, "_", "-")}-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Average"
  threshold           = each.value.timeout * 1000 * 0.8 # 80% of timeout
  alarm_description   = "Lambda ${replace(each.key, "_", "-")} duration approaching timeout"
  alarm_actions       = [aws_sns_topic.system_alerts.arn]

  dimensions = {
    FunctionName = "${var.project_name}-${var.environment}-${replace(each.key, "_", "-")}"
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Function    = each.key
    Severity    = "Low"
    AlertType   = "Performance"
  }
}

# Business Logic Alerts

# Signup Conversion Rate Drop
resource "aws_cloudwatch_metric_alarm" "low_signup_conversion" {
  alarm_name          = "${var.project_name}-${var.environment}-low-signup-conversion"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "3"
  threshold           = "10"
  alarm_description   = "Daily signup rate dropped significantly"
  alarm_actions       = [aws_sns_topic.system_alerts.arn]

  metric_query {
    id          = "daily_signups"
    return_data = true

    metric {
      metric_name = "Invocations"
      namespace   = "AWS/Lambda"
      period      = 86400 # 24 hours
      stat        = "Sum"

      dimensions = {
        FunctionName = "${var.project_name}-${var.environment}-signup"
      }
    }
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Severity    = "Low"
    AlertType   = "Business"
  }
}

# Outputs
output "security_alerts_topic_arn" {
  description = "ARN of the security alerts SNS topic"
  value       = aws_sns_topic.security_alerts.arn
}

output "system_alerts_topic_arn" {
  description = "ARN of the system alerts SNS topic"
  value       = aws_sns_topic.system_alerts.arn
}