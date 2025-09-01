# CloudWatch Dashboards for Authentication System Monitoring

# Dashboard 1: Security Overview
resource "aws_cloudwatch_dashboard" "security_overview" {
  dashboard_name = "${var.project_name}-${var.environment}-security-overview"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/Lambda", "Errors", "FunctionName", "${var.project_name}-${var.environment}-signin"]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Failed Login Attempts (Last 24 Hours)"
          period  = 300
          stat    = "Sum"
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 6
        height = 6

        properties = {
          metrics = [
            ["AWS/Lambda", "Invocations", "FunctionName", "${var.project_name}-${var.environment}-signin"]
          ]
          view   = "singleValue"
          region = var.aws_region
          title  = "Active Sessions (Current)"
          period = 300
          stat   = "Sum"
        }
      },
      {
        type   = "log"
        x      = 18
        y      = 0
        width  = 6
        height = 6

        properties = {
          query  = "SOURCE '/aws/lambda/${var.project_name}-${var.environment}-signin' | fields @timestamp\n| filter @message like /ERROR/\n| stats count() by bin(1h)\n| sort @timestamp desc"
          region = var.aws_region
          title  = "Inactivity Logouts by IP"
          view   = "table"
        }
      },
      {
        type   = "log"
        x      = 0
        y      = 6
        width  = 12
        height = 8

        properties = {
          query  = "SOURCE '/aws/lambda/${var.project_name}-${var.environment}-signin' | fields @timestamp\n| filter @message like /Incorrect username or password/\n| stats count() by bin(1h)\n| sort @timestamp desc"
          region = var.aws_region
          title  = "Top Failed Login IP Addresses"
          view   = "table"
        }
      },
      {
        type   = "log"
        x      = 12
        y      = 6
        width  = 12
        height = 8

        properties = {
          query  = "SOURCE '/aws/lambda/${var.project_name}-${var.environment}-security-alerts' | fields @timestamp, event, severity, ipAddress, details\n| filter severity in [\"high\", \"critical\"]\n| sort @timestamp desc\n| limit 50"
          region = var.aws_region
          title  = "Recent Security Alerts"
          view   = "table"
        }
      }
    ]
  })

  depends_on = [
    aws_cloudwatch_log_group.lambda_logs
  ]
}

# Dashboard 2: User Activity Analytics
resource "aws_cloudwatch_dashboard" "user_activity" {
  dashboard_name = "${var.project_name}-${var.environment}-user-activity"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/Lambda", "Invocations", "FunctionName", "${var.project_name}-${var.environment}-signin"]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Daily Active Users"
          period  = 86400
          stat    = "Sum"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 6
        height = 6

        properties = {
          metrics = [
            ["AWS/Lambda", "Invocations", "FunctionName", "${var.project_name}-${var.environment}-signup"]
          ]
          view   = "singleValue"
          region = var.aws_region
          title  = "New Signups Today"
          period = 86400
          stat   = "Sum"
        }
      },
      {
        type   = "metric"
        x      = 18
        y      = 0
        width  = 6
        height = 6

        properties = {
          metrics = [
            ["AWS/Lambda", "Duration", "FunctionName", "${var.project_name}-${var.environment}-signin"],
            [".", ".", "FunctionName", "${var.project_name}-${var.environment}-signup"],
            [".", ".", "FunctionName", "${var.project_name}-${var.environment}-verify"]
          ]
          view   = "timeSeries"
          region = var.aws_region
          title  = "Average Session Duration"
          period = 300
          stat   = "Average"
        }
      },
      {
        type   = "log"
        x      = 0
        y      = 6
        width  = 12
        height = 8

        properties = {
          query  = "SOURCE '/aws/lambda/${var.project_name}-${var.environment}-signin' | fields @timestamp\n| filter @message like /Sign in successful/\n| stats count() by bin(1h)\n| sort @timestamp desc"
          region = var.aws_region
          title  = "Page Views by Route"
          view   = "table"
        }
      },
      {
        type   = "log"
        x      = 12
        y      = 6
        width  = 12
        height = 8

        properties = {
          query  = "SOURCE '/aws/lambda/${var.project_name}-${var.environment}-signin' | fields @timestamp, @duration\n| stats avg(@duration), max(@duration), min(@duration) by bin(5m)"
          region = var.aws_region
          title  = "API Response Times"
          view   = "timeSeries"
        }
      }
    ]
  })

  depends_on = [
    aws_cloudwatch_log_group.lambda_logs
  ]
}

# Dashboard 3: System Health & Performance
resource "aws_cloudwatch_dashboard" "system_health" {
  dashboard_name = "${var.project_name}-${var.environment}-system-health"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 8
        height = 6

        properties = {
          metrics = [
            for function_name in keys(local.lambda_functions) : [
              "AWS/Lambda", "Invocations", "FunctionName", "${var.project_name}-${var.environment}-${function_name}"
            ]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Lambda Invocations by Function"
          period  = 300
          stat    = "Sum"
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 0
        width  = 8
        height = 6

        properties = {
          metrics = [
            for function_name in keys(local.lambda_functions) : [
              "AWS/Lambda", "Errors", "FunctionName", "${var.project_name}-${var.environment}-${function_name}"
            ]
          ]
          view    = "timeSeries"
          stacked = true
          region  = var.aws_region
          title   = "Lambda Errors by Function"
          period  = 300
          stat    = "Sum"
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 0
        width  = 8
        height = 6

        properties = {
          metrics = [
            for function_name in keys(local.lambda_functions) : [
              "AWS/Lambda", "Duration", "FunctionName", "${var.project_name}-${var.environment}-${function_name}"
            ]
          ]
          view   = "timeSeries"
          region = var.aws_region
          title  = "Lambda Duration (Performance)"
          period = 300
          stat   = "Average"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ApiGateway", "4XXError", "ApiName", "${var.project_name}-${var.environment}-api"],
            [".", "5XXError", ".", "."],
            [".", "Count", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "API Gateway Metrics"
          period  = 300
          stat    = "Sum"
        }
      },
      {
        type   = "log"
        x      = 12
        y      = 6
        width  = 12
        height = 6

        properties = {
          query  = "SOURCE '/aws/lambda/${var.project_name}-${var.environment}-refresh' | fields @timestamp\n| filter @message like /successful/\n| stats count() by bin(1h)\n| sort @timestamp desc"
          region = var.aws_region
          title  = "Token Refresh Success Rate"
          view   = "timeSeries"
        }
      },
      {
        type   = "log"
        x      = 0
        y      = 12
        width  = 24
        height = 6

        properties = {
          query  = "SOURCE '/aws/lambda/${var.project_name}-${var.environment}-signin' | fields @timestamp, @message\n| filter @message like /ERROR/\n| sort @timestamp desc\n| limit 100"
          region = var.aws_region
          title  = "Recent System Errors"
          view   = "table"
        }
      }
    ]
  })

  depends_on = [
    aws_cloudwatch_log_group.lambda_logs,
    aws_api_gateway_rest_api.main
  ]
}

# Critical Security Alerts
resource "aws_cloudwatch_metric_alarm" "failed_login_spike" {
  alarm_name          = "${var.project_name}-${var.environment}-failed-login-spike"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  threshold           = "10"
  alarm_description   = "This metric monitors failed login attempts"
  alarm_actions       = [] # Add SNS topic ARN for notifications

  metric_name = "IncomingLogEvents"
  namespace   = "AWS/Logs"
  period      = "300"
  statistic   = "Sum"

  dimensions = {
    LogGroupName = "/aws/lambda/${var.project_name}-${var.environment}-signin"
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
    AlertType   = "Security"
  }
}

resource "aws_cloudwatch_metric_alarm" "api_error_rate" {
  alarm_name          = "${var.project_name}-${var.environment}-api-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "4XXError"
  namespace           = "AWS/ApiGateway"
  period              = "300"
  statistic           = "Sum"
  threshold           = "50"
  alarm_description   = "API Gateway 4XX error rate too high"

  dimensions = {
    ApiName = "${var.project_name}-${var.environment}-api"
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
    AlertType   = "Performance"
  }
}

resource "aws_cloudwatch_metric_alarm" "lambda_error_rate" {
  for_each = local.lambda_functions

  alarm_name          = "${var.project_name}-${var.environment}-${replace(each.key, "_", "-")}-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "Lambda function ${replace(each.key, "_", "-")} error rate too high"

  dimensions = {
    FunctionName = "${var.project_name}-${var.environment}-${replace(each.key, "_", "-")}"
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
    AlertType   = "Technical"
    Function    = each.key
  }
}

# Output dashboard URLs
output "security_dashboard_url" {
  description = "URL of the Security Overview dashboard"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.security_overview.dashboard_name}"
}

output "user_activity_dashboard_url" {
  description = "URL of the User Activity dashboard"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.user_activity.dashboard_name}"
}

output "system_health_dashboard_url" {
  description = "URL of the System Health dashboard"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.system_health.dashboard_name}"
}

# Dashboard URLs are available in the output values above