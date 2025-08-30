# 📊 CloudWatch Dashboards & Monitoring Summary

## 🔗 Dashboard URLs

### Security Overview Dashboard
**Purpose**: Monitor failed logins, suspicious activity, security alerts
**URL**: https://${aws_region}.console.aws.amazon.com/cloudwatch/home?region=${aws_region}#dashboards:name=${project_name}-${environment}-security-overview

**Key Metrics**:
- Failed login attempts (last 24 hours)
- Active sessions count
- Top failed login IP addresses
- Recent security alerts
- Inactivity logouts by IP

### User Activity Dashboard  
**Purpose**: Track user engagement, session analytics, business metrics
**URL**: https://${aws_region}.console.aws.amazon.com/cloudwatch/home?region=${aws_region}#dashboards:name=${project_name}-${environment}-user-activity

**Key Metrics**:
- Daily active users
- New signups today
- Page views by route
- Average session duration
- API response times

### System Health Dashboard
**Purpose**: Monitor system performance, errors, infrastructure health
**URL**: https://${aws_region}.console.aws.amazon.com/cloudwatch/home?region=${aws_region}#dashboards:name=${project_name}-${environment}-system-health

**Key Metrics**:
- Lambda invocations by function
- Lambda errors and duration
- API Gateway metrics (4XX, 5XX, latency)
- Token refresh success rate
- Recent system errors

## 🚨 Alert Configuration

### Email Recipients
- **Security Alerts**: ${security_email}
- **System Alerts**: ${system_email}

### Critical Alerts Setup
The following alerts will send email notifications:

#### 🔐 Security Alerts (High Priority)
- **Failed Login Spike**: 5+ failed attempts from same IP in 10 minutes
- **Token Refresh Failures**: 20+ refresh failures in 5 minutes  
- **Suspicious Login Activity**: Geographic anomalies or unusual patterns

#### ⚙️ System Alerts (Medium Priority)
- **API Gateway Errors**: 100+ 4XX errors in 5 minutes
- **Lambda Function Errors**: 5+ errors per function in 5 minutes
- **Lambda Duration**: Functions approaching timeout limits
- **Low Signup Conversion**: Daily signups drop below 10

#### 📈 Business Alerts (Low Priority) 
- **Daily Signup Rate**: Significant drops in user registration
- **Session Duration**: Changes in user engagement patterns

## 📋 Log Groups & Queries

### Audit Log Groups
```
/aws/lambda/${project_name}-${environment}-audit-user_activity
/aws/lambda/${project_name}-${environment}-audit-auth_event
/aws/lambda/${project_name}-${environment}-audit-security_event
/aws/lambda/${project_name}-${environment}-audit-api_call
/aws/lambda/${project_name}-${environment}-audit-token_event
/aws/lambda/${project_name}-${environment}-security-alerts
```

### Useful CloudWatch Insights Queries

#### Failed Login Analysis
```sql
SOURCE '/aws/lambda/${project_name}-${environment}-audit-auth_event' 
| fields @timestamp, ipAddress, details.email, details.errorMessage
| filter success = false
| stats count() by ipAddress
| sort count desc
| limit 50
```

#### User Activity Timeline
```sql
SOURCE '/aws/lambda/${project_name}-${environment}-audit-user_activity' 
| fields @timestamp, action, userId, ipAddress, details.page
| filter action = "USER_ACTIVE"
| sort @timestamp desc
| limit 100
```

#### Security Events Dashboard
```sql
SOURCE '/aws/lambda/${project_name}-${environment}-security-alerts' 
| fields @timestamp, event, severity, ipAddress, details
| filter severity in ["high", "critical"]
| sort @timestamp desc
| limit 25
```

## 🔧 Access & Permissions

### Dashboard Viewer Role
**Role ARN**: arn:aws:iam::${account_id}:role/${project_name}-${environment}-dashboard-viewer

**Switch Role URL**: https://signin.aws.amazon.com/switchrole?account=${account_id}&roleName=${project_name}-${environment}-dashboard-viewer&displayName=${project_name}-dashboard-viewer

### Permissions Included
- View all CloudWatch dashboards
- Query authentication log groups
- View Lambda function metrics
- Access API Gateway metrics
- Read security and system alerts

## 💰 Estimated Monthly Costs

### CloudWatch Pricing (US East region estimates)
- **3 Dashboards**: $9.00/month
- **~10 Custom Metrics**: $3.00/month  
- **~15 Alarms**: $1.50/month
- **Log Storage** (50GB): $25.00/month
- **Log Queries**: $5.00/month

**Total Estimated**: ~$43.50/month

### Cost Optimization Tips
- Set log retention policies (14-30 days for development)
- Use log sampling for high-volume events
- Archive old logs to S3 for long-term storage
- Monitor CloudWatch usage in AWS Cost Explorer

## 🚀 Getting Started

### Step 1: Confirm Email Subscriptions
After deployment, check your email (${security_email}) for SNS subscription confirmations and click "Confirm subscription" links.

### Step 2: Access Dashboards
Use the URLs above to access each dashboard. Bookmark them for quick access.

### Step 3: Test Alerts
- Try logging in with wrong credentials 5+ times to trigger security alert
- Monitor system during high load to see performance alerts

### Step 4: Customize Thresholds
Adjust alert thresholds in `sns_alerts.tf` based on your actual usage patterns.

## 📞 Support & Troubleshooting

### Common Issues
- **No email alerts**: Check SNS subscription confirmations
- **Missing data**: Verify log groups are created and receiving data  
- **High costs**: Review log retention and query frequency
- **Dashboard errors**: Check IAM permissions for CloudWatch access

### Contact Information
- **Primary Admin**: ${security_email}
- **AWS Account**: ${account_id}
- **Region**: ${aws_region}

---

**Generated**: $(date)
**Project**: ${project_name}-${environment}
**Version**: 1.0