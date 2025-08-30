# CloudWatch Log Groups for Lambda Functions
resource "aws_cloudwatch_log_group" "lambda_logs" {
  for_each = local.lambda_functions

  name              = "/aws/lambda/${var.project_name}-${var.environment}-${each.key}"
  retention_in_days = 14
  skip_destroy      = false

  lifecycle {
    prevent_destroy = false
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# CloudWatch Log Stream for each Lambda function
resource "aws_cloudwatch_log_stream" "lambda_log_streams" {
  for_each = local.lambda_functions

  name           = "${var.project_name}-${var.environment}-${each.key}-stream"
  log_group_name = aws_cloudwatch_log_group.lambda_logs[each.key].name

  depends_on = [aws_cloudwatch_log_group.lambda_logs]
}


# CloudWatch Metric Filters for Error Tracking
resource "aws_cloudwatch_log_metric_filter" "lambda_errors" {
  for_each = local.lambda_functions

  name           = "${var.project_name}-${var.environment}-${each.key}-errors"
  log_group_name = aws_cloudwatch_log_group.lambda_logs[each.key].name
  pattern        = "ERROR"

  metric_transformation {
    name      = "${var.project_name}-${var.environment}-${each.key}-errors"
    namespace = "Lambda/Errors"
    value     = "1"
  }

  depends_on = [aws_cloudwatch_log_group.lambda_logs]
}

# CloudWatch Alarms for Lambda Errors
resource "aws_cloudwatch_metric_alarm" "lambda_error_alarm" {
  for_each = local.lambda_functions

  alarm_name          = "${var.project_name}-${var.environment}-${each.key}-error-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "${var.project_name}-${var.environment}-${each.key}-errors"
  namespace           = "Lambda/Errors"
  period              = "60"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "This metric monitors lambda errors for ${each.key}"

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }

  depends_on = [aws_cloudwatch_log_metric_filter.lambda_errors]
}

# CloudWatch Dashboard for Lambda Monitoring
resource "aws_cloudwatch_dashboard" "lambda_dashboard" {
  dashboard_name = "${var.project_name}-${var.environment}-lambda-dashboard"

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
            for function_name in keys(local.lambda_functions) : [
              "AWS/Lambda", "Invocations", "FunctionName", "${var.project_name}-${var.environment}-${function_name}"
            ]
          ]
          period = 300
          stat   = "Sum"
          region = "ap-southeast-2"
          title  = "Lambda Invocations"
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
            for function_name in keys(local.lambda_functions) : [
              "AWS/Lambda", "Errors", "FunctionName", "${var.project_name}-${var.environment}-${function_name}"
            ]
          ]
          period = 300
          stat   = "Sum"
          region = "ap-southeast-2"
          title  = "Lambda Errors"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6

        properties = {
          metrics = [
            for function_name in keys(local.lambda_functions) : [
              "AWS/Lambda", "Duration", "FunctionName", "${var.project_name}-${var.environment}-${function_name}"
            ]
          ]
          period = 300
          stat   = "Average"
          region = "ap-southeast-2"
          title  = "Lambda Duration"
        }
      }
    ]
  })

  lifecycle {
    prevent_destroy = false
  }
}

# Output CloudWatch Log Group ARNs for reference
output "cloudwatch_log_groups" {
  description = "ARNs of the CloudWatch log groups"
  value = {
    for k, v in aws_cloudwatch_log_group.lambda_logs : k => v.arn
  }
}

# Output Dashboard URL
output "cloudwatch_dashboard_url" {
  description = "URL of the CloudWatch dashboard"
  value       = "https://ap-southeast-2.console.aws.amazon.com/cloudwatch/home?region=ap-southeast-2#dashboards:name=${aws_cloudwatch_dashboard.lambda_dashboard.dashboard_name}"
}