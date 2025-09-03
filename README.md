# 🔐 Serverless Authentication System with AWS Cognito

[![AWS](https://img.shields.io/badge/AWS-Serverless-orange)](https://aws.amazon.com)
[![Terraform](https://img.shields.io/badge/Terraform-IaC-purple)](https://terraform.io)
[![React](https://img.shields.io/badge/React-19.1-blue)](https://reactjs.org)
[![Python](https://img.shields.io/badge/Python-3.9-green)](https://python.org)

A production-ready serverless authentication system built on AWS, featuring **100% httpOnly cookie security**, comprehensive rate limiting, and Google OAuth integration.

## 🌟 Key Features

### Implemented Authentication Features
✅ **User Registration** with email verification  
✅ **Secure Sign-in** with httpOnly cookies  
✅ **Google OAuth 2.0** integration  
✅ **Password Reset** flow with email codes  
✅ **Token Refresh** mechanism  
✅ **Session Management** with inactivity detection  
✅ **Email Verification** with resend capability  
✅ **User Logout** with cookie clearing  

### Security Implementation
🔒 **HttpOnly Cookies** - Tokens never exposed to JavaScript  
🛡️ **CSRF Protection** - SameSite=Strict cookies  
🚦 **Rate Limiting** - Per-endpoint throttling  
🔑 **Secure Passwords** - Cryptographically random for OAuth users  
📊 **Security Monitoring** - CloudWatch dashboards & alarms  
🔐 **Token Security** - Access (1hr), Refresh (30 days)  

## 🏗️ Architecture Overview

### Current Implementation

```
Frontend (React 19.1 + Redux Toolkit)
    ↓
CloudFront CDN → S3 Static Hosting
    ↓
API Gateway (Rate Limited)
    ↓
Lambda Functions (Python 3.9):
  • signup          • signin
  • google_auth     • refresh
  • forgot_password • reset_password
  • verify          • verify_token
  • user_info       • logout
  • resend_verification
  • custom_message (Cognito trigger)
    ↓
AWS Cognito User Pool
    ↓
DynamoDB (User Records)
    ↓
CloudWatch Logs & Dashboards
    ↓
SNS Email Alerts
```

### Domains Configuration
- **Frontend**: `https://filodelight.online`
- **API**: `https://api.filodelight.online`
- **Region**: `ap-southeast-2` (Sydney)

## 🚀 Quick Start

### Prerequisites
- AWS Account
- Terraform >= 1.5
- Node.js >= 18
- Python >= 3.9
- Google OAuth Client (for Google sign-in)

### 1. Clone Repository
```bash
git clone https://github.com/CaringalML/Serverless-Auth-with-AWS-Cognito.git
cd Serverless-Auth-with-AWS-Cognito
```

### 2. Configure Variables
```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your:
# - Google OAuth credentials
# - Alert email addresses
```

### 3. Deploy Infrastructure
```bash
terraform init
terraform plan
terraform apply
```

### 4. Deploy Frontend
```bash
cd frontend-auth
npm install
npm run build

# Upload to S3 (replace with your bucket)
aws s3 sync build/ s3://serverless-auth-cognito-frontend-2025/react-build --delete

# Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

## 📦 Lambda Functions

| Function | Purpose | Trigger |
|----------|---------|---------|
| `signup` | User registration | POST /auth/signup |
| `signin` | User login | POST /auth/signin |
| `google_auth` | Google OAuth flow | GET /auth/google, /auth/google/callback |
| `verify` | Email verification | POST /auth/verify |
| `forgot_password` | Initiate password reset | POST /auth/forgot-password |
| `reset_password` | Complete password reset | POST /auth/reset-password |
| `refresh` | Refresh access token | POST /auth/refresh |
| `logout` | Clear auth cookies | POST /auth/logout |
| `user_info` | Get user profile | GET /auth/user-info |
| `verify_token` | Validate token | GET /auth/verify-token |
| `resend_verification` | Resend verification email | POST /auth/resend-verification |
| `custom_message` | Customize Cognito emails | Cognito trigger |

## 🔒 Security Features

### Rate Limiting (Implemented)
| Endpoint | Rate | Burst | Purpose |
|----------|------|-------|---------|
| /auth/signin | 5/sec | 10 | Prevent brute force |
| /auth/signup | 2/sec | 5 | Prevent bot registration |
| /auth/forgot-password | 1/sec | 3 | Prevent email bombing |
| /auth/verify | 3/sec | 6 | Prevent code guessing |
| /auth/refresh | 10/sec | 20 | Token refresh |
| /auth/google/* | 10/sec | 20 | OAuth flow |

### Cookie Configuration
```javascript
HttpOnly: true     // XSS Protection
Secure: true       // HTTPS Only
SameSite: Strict   // CSRF Protection
Domain: .filodelight.online  // Shared across subdomains
```

## 📊 Monitoring & Alerting

### CloudWatch Dashboards (3)
1. **Security Overview** - Failed logins, suspicious activity
2. **User Activity** - Signups, active users, page views
3. **System Health** - Lambda performance, API errors

### SNS Alerts Configured
- **High Failed Logins** - 10+ failures in 5 minutes
- **API Errors** - 100+ errors in 5 minutes
- **Lambda Errors** - Function failures
- **Token Refresh Failures** - Authentication issues
- **Throttling Alerts** - Rate limit violations

### Key Metrics Tracked
- Failed login attempts by IP
- Daily active users
- New signups
- API response times
- Lambda cold starts
- Token refresh success rate

## 💻 Frontend Stack

### Technologies
- **React 19.1** - Latest React version
- **Redux Toolkit** - State management
- **React Router v7** - Navigation
- **Axios** - HTTP client with interceptors
- **Tailwind CSS** - Styling

### Components
- `SignIn.jsx` - Login with Google OAuth
- `SignUp.jsx` - Registration form
- `Verify.jsx` - Email verification
- `Dashboard.jsx` - Protected user area
- `ForgotPassword.jsx` - Password reset initiation
- `ResetPassword.jsx` - Password reset completion
- `ProtectedRoute.jsx` - Auth guard
- `InactivityWarning.jsx` - Session timeout

## 🚢 CI/CD Pipeline

### GitHub Actions Workflow
- **Trigger**: Push to `google-OAuth` branch
- **Terraform Validation**: Format & syntax check
- **React Build**: Node.js 20.x
- **S3 Deployment**: Automatic upload
- **CloudFront Invalidation**: Cache clearing

### Required GitHub Secrets
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `REACT_APP_API_URL`
- `CLOUDFRONT_DISTRIBUTION_ID`

## 💰 Actual Infrastructure Costs

### Current AWS Services Used
| Service | Monthly Cost (Estimate) |
|---------|------------------------|
| Cognito | $0 (50K MAU free tier) |
| Lambda | ~$2 (with free tier) |
| API Gateway | ~$3.50 |
| DynamoDB | ~$0.25 |
| CloudWatch | ~$10 (3 dashboards) |
| CloudFront | ~$1 |
| Route53 | $0.50 |
| S3 | ~$0.10 |
| SNS | ~$0.10 |
| **Total** | **~$17.45/month** |

## 📁 Project Structure

```
.
├── lambda_functions/         # 14 Lambda functions
│   ├── signin/
│   ├── signup/
│   ├── google_auth/
│   ├── verify/
│   ├── forgot_password/
│   ├── reset_password/
│   ├── refresh/
│   ├── logout/
│   ├── user_info/
│   ├── verify_token/
│   ├── resend_verification/
│   ├── custom_message/
│   └── shared/              # Utils layer
├── frontend-auth/           # React application
│   ├── src/
│   │   ├── components/     # 8 components
│   │   ├── services/       # Auth service
│   │   ├── store/          # Redux store
│   │   ├── contexts/       # Auth context
│   │   └── utils/          # Validation
│   └── package.json
├── .github/workflows/       # CI/CD pipeline
├── *.tf files              # 14 Terraform configs
└── terraform.tfvars.example
```

## 🔧 Configuration Files

### Terraform Resources (14 files)
- `api_gateway.tf` - REST API with rate limiting
- `cognito.tf` - User pool & Google identity provider
- `dynamodb.tf` - User records table
- `lambda.tf` - Function definitions
- `cloudfront.tf` - CDN configuration
- `s3.tf` - Static website hosting
- `route53.tf` - DNS configuration
- `cloudwatch.tf` - Logs configuration
- `cloudwatch_dashboards.tf` - 3 dashboards
- `sns_alerts.tf` - Email notifications
- `iam.tf` - Roles and policies
- `variables.tf` - Configuration variables
- `outputs.tf` - Deployment outputs
- `provider.tf` - AWS provider

## 🚨 Production Checklist

- [x] Custom domain configured (filodelight.online)
- [x] SSL certificates active
- [x] Google OAuth configured
- [x] Rate limiting enabled
- [x] CloudWatch dashboards created
- [x] SNS email alerts configured
- [x] httpOnly cookies implemented
- [x] CORS configured
- [ ] DynamoDB backup strategy
- [ ] Disaster recovery plan
- [ ] Load testing completed
- [ ] Security audit performed

## 🛠️ Common Operations

### View Logs
```bash
aws logs tail /aws/lambda/serverless-auth-dev-signin --follow
```

### Check Metrics
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=serverless-auth-dev-signin \
  --start-time 2025-09-03T00:00:00Z \
  --end-time 2025-09-04T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

### Update Lambda Function
```bash
cd lambda_functions/signin
zip -r ../signin.zip .
aws lambda update-function-code \
  --function-name serverless-auth-dev-signin \
  --zip-file fileb://../signin.zip
```

## 🐛 Troubleshooting

### Common Issues

**Cookie not being set**
- Ensure domains share same root domain
- Check SameSite and Secure flags
- Verify CORS configuration

**Google OAuth redirect error**
- Update redirect URIs in Google Console
- Check environment variables in Lambda
- Verify API Gateway routes

**Rate limiting too strict**
- Adjust limits in `api_gateway.tf`
- Monitor CloudWatch metrics
- Consider user patterns

**Lambda cold starts**
- Enable provisioned concurrency
- Optimize package size
- Use Lambda layers for dependencies

## 📝 License

MIT License - See [LICENSE](LICENSE) file

## 👨‍💻 Author

**Martin Lawrence Caringal**  
Email: lawrencecaringal5@gmail.com  
GitHub: [@CaringalML](https://github.com/CaringalML)

## 🙏 Acknowledgments

- AWS for serverless infrastructure
- Claude AI for development assistance
- Open source community

---

*Last Updated: September 2025*  
*Version: 1.0.0*