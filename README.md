# Serverless Authentication System

Full-stack authentication system using AWS Cognito, Lambda, API Gateway, DynamoDB, and React with Redux.

## Architecture

- **Frontend**: React with Redux Toolkit and Tailwind CSS
- **Backend**: Python 3.12 Lambda functions
- **Authentication**: AWS Cognito User Pool
- **API**: AWS API Gateway with CORS configuration
- **Database**: DynamoDB
- **Infrastructure**: Terraform

## Features

- User signup with email verification
- User signin with JWT tokens
- Password reset functionality
- Protected dashboard route
- Modern UI with Tailwind CSS
- State management with Redux Toolkit

## Setup Instructions

### 1. Deploy Infrastructure

```bash
# Initialize Terraform
terraform init

# Review the deployment plan
terraform plan

# Deploy the infrastructure
terraform apply
```

### 2. Update Frontend Configuration

After deploying, update the API URL in `frontend-auth/.env`:

```
REACT_APP_API_URL=<your-api-gateway-url>
```

You can find the API URL in the Terraform outputs.

### 3. Run the Frontend

```bash
cd frontend-auth
npm install
npm start
```

## Project Structure

```
.
├── lambda_functions/       # Lambda function code
│   ├── signup/
│   ├── signin/
│   ├── verify/
│   ├── forgot_password/
│   ├── reset_password/
│   └── shared/            # Shared utilities
├── frontend-auth/         # React application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── services/     # API services
│   │   ├── store/        # Redux store
│   │   └── config/       # Configuration
├── *.tf                   # Terraform infrastructure files
└── README.md
```

## API Endpoints

- `POST /auth/signup` - Register new user
- `POST /auth/signin` - Sign in user
- `POST /auth/verify` - Verify email
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password

## Security Notes

1. JWT tokens are stored in localStorage (for simplicity)
2. Tokens are automatically included in API requests
3. CORS is configured for all origins (update for production)
4. Password requirements: 8+ characters, uppercase, lowercase, numbers, symbols

## Next Steps for Production

1. **Security Enhancements**:
   - Store tokens in httpOnly cookies
   - Implement refresh token rotation
   - Add rate limiting
   - Configure specific CORS origins
   - Add API key authentication

2. **Infrastructure**:
   - Add CloudFront distribution
   - Configure custom domain
   - Set up monitoring and alerting
   - Add backup and disaster recovery

3. **Frontend**:
   - Add token expiry handling
   - Implement session timeout
   - Add loading states
   - Improve error handling

## Environment Variables

### Lambda Functions
- `COGNITO_CLIENT_ID` - Cognito app client ID
- `COGNITO_USER_POOL_ID` - Cognito user pool ID
- `USERS_TABLE` - DynamoDB table name

### Frontend
- `REACT_APP_API_URL` - API Gateway endpoint URL