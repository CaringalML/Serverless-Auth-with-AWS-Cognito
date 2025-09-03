# Serverless Authentication System with HttpOnly Cookies

🔒 **Enterprise-grade serverless authentication system** using AWS Cognito, Lambda, API Gateway, and React with **secure httpOnly cookie implementation** for maximum protection against XSS and CSRF attacks.

## 🏗️ Architecture

### Infrastructure
- **Frontend**: React with Redux Toolkit and Tailwind CSS (CloudFront)
- **Backend**: Python 3.12 Lambda functions (API Gateway)
- **Authentication**: AWS Cognito User Pool with httpOnly cookies
- **Database**: DynamoDB for user data
- **Infrastructure**: Terraform for IaC
- **Domain**: Custom domain setup for same-origin cookie sharing

### Domain Architecture
- **Frontend**: `https://your-domain.com` (CloudFront distribution)
- **API**: `https://api.your-domain.com` (API Gateway custom domain) 
- **Same Root Domain**: Enables secure SameSite=Strict cookie sharing
- **Example Implementation**: `filodelight.online` & `api.filodelight.online`

## 🔒 HttpOnly Cookie Security Implementation

### Security Features
| Feature | Implementation | Security Benefit |
|---------|---------------|-----------------|
| **HttpOnly** | `true` | Prevents XSS attacks - JavaScript cannot access tokens |
| **Secure** | `true` | HTTPS-only transmission - no token exposure over HTTP |
| **SameSite** | `Strict` | Maximum CSRF protection - same-domain requests only |
| **Custom Domain** | Same root domain | Enables strict cookie security without cross-origin issues |

### Token Management
- **Access Token**: 1-hour expiry, httpOnly cookie (authentication)
- **ID Token**: 1-hour expiry, httpOnly cookie (user profile data)
- **Refresh Token**: 30-day expiry, httpOnly cookie (token renewal)
- **Zero JavaScript Access**: Tokens completely invisible to frontend code

### Page Refresh Handling
**Problem**: HttpOnly cookies need time to become available after page refresh
**Solution**: Dual-layer timing protection
- **ProtectedRoute**: 800ms initial delay for cookie processing
- **Authentication Check**: 500ms additional buffer for reliability
- **Total**: 1.3-second buffer prevents false authentication failures

## ⚡ Features

### Authentication Flow
- ✅ User signup with email verification
- ✅ Secure signin with httpOnly cookie tokens
- ✅ **Google OAuth authentication** with secure httpOnly cookies
- ✅ Password reset functionality with secure token handling
- ✅ Automatic token refresh using refresh token from cookies
- ✅ Secure logout with server-side cookie clearing
- ✅ Page refresh authentication persistence

### Security Features
- ✅ **Zero XSS Vulnerability**: Tokens never accessible to JavaScript
- ✅ **CSRF Protection**: SameSite=Strict prevents cross-site attacks
- ✅ **Secure Transport**: All tokens transmitted over HTTPS only
- ✅ **Activity Tracking**: 2-hour inactivity timeout with warnings
- ✅ **Automatic Session Management**: Seamless token refresh
- ✅ **Protected Routes**: Authentication-required page protection

### User Experience
- ✅ Modern UI with Tailwind CSS
- ✅ Real-time form validation
- ✅ Loading states with authentication verification
- ✅ Error handling with user-friendly messages
- ✅ Responsive design for all devices

## 🚀 Setup Instructions

### Prerequisites

#### 1. Domain Setup (Required for HttpOnly Cookies)

⚠️ **IMPORTANT**: This system requires a custom domain for httpOnly cookie security to work properly.

#### Step 1: Purchase Domain
Purchase a domain from any domain registrar (GoDaddy, Namecheap, etc.):
- Example domain used in this project: `filodelight.online`
- Choose any domain that suits your project

#### Step 2: Create AWS Hosted Zone (Manual Setup Required)
1. **Go to AWS Console** → Route 53 → Hosted Zones
2. **Click "Create Hosted Zone"**
3. **Enter your domain name** (e.g., `filodelight.online`)
4. **Click "Create Hosted Zone"**
5. **Copy the 4 Name Servers** from the NS record (e.g., `ns-123.awsdns-12.com`)

#### Step 3: Update Domain Nameservers
1. **Log into your domain registrar** (GoDaddy, Namecheap, etc.)
2. **Go to DNS Management / Nameservers section**
3. **Replace default nameservers** with the 4 AWS nameservers
4. **Save changes**

#### Step 4: Wait for DNS Propagation
- **Wait Time**: 1.5 - 2 hours for DNS propagation
- **Check Status**: Use `nslookup your-domain.com` or online DNS checkers
- **Required**: DO NOT proceed with deployment until DNS propagates

#### 2. Google OAuth Setup (Required for Google Sign-In)

⚠️ **IMPORTANT**: Google OAuth must be configured before deployment for Google Sign-In to work.

##### Step 1: Access Google Cloud Console
1. **Go to [Google Cloud Console](https://console.cloud.google.com)**
2. **Sign in** with your Google account

##### Step 2: Create or Select Project
1. **Click the project dropdown** at the top of the page (next to "Google Cloud")
2. **Click "NEW PROJECT"** or select an existing project
3. **Enter project details**:
   - Project name: `Serverless Auth App`
   - Leave organization as default
   - Click **"CREATE"**

##### Step 3: Enable Required APIs
1. **Navigate to "APIs & Services"** → **"Library"** (left sidebar)
2. **Search for** `Google+ API`
3. **Click on "Google+ API"** in results
4. **Click "ENABLE"** button
5. Wait for API activation (redirects to dashboard when complete)

##### Step 4: Configure OAuth Consent Screen
1. **Go to "APIs & Services"** → **"OAuth consent screen"** (left sidebar)
2. **Select User Type**: Choose **"External"** → Click **"CREATE"**
3. **App Information**:
   - App name: `Serverless Auth App`
   - User support email: Select your email from dropdown
   - App logo: Skip (optional)
4. **App Domain** (optional but recommended):
   - Application home page: `https://filodelight.online`
   - Privacy policy link: Skip (optional)
   - Terms of service link: Skip (optional)
5. **Authorized domains**:
   - Click **"+ ADD DOMAIN"**
   - Add: `filodelight.online`
   - Click **"+ ADD DOMAIN"** again
   - Add: `amazoncognito.com`
6. **Developer contact**: Enter your email
7. Click **"SAVE AND CONTINUE"**
8. **Scopes**:
   - Click **"ADD OR REMOVE SCOPES"**
   - Select:
     - ✅ `.../auth/userinfo.email`
     - ✅ `.../auth/userinfo.profile`
     - ✅ `openid`
   - Click **"UPDATE"** → **"SAVE AND CONTINUE"**
9. **Test users**: Skip (click **"SAVE AND CONTINUE"**)
10. **Summary**: Review → Click **"BACK TO DASHBOARD"**

##### Step 5: Create OAuth 2.0 Client ID
1. **Go to "APIs & Services"** → **"Credentials"** (left sidebar)
2. **Click "+ CREATE CREDENTIALS"** → Select **"OAuth client ID"**
3. **Configure OAuth client**:
   - Application type: **Web application**
   - Name: `Serverless Auth Web Client`

##### Step 6: Add Authorized Redirect URIs
**⚠️ CRITICAL: Add these EXACT URIs (no trailing slashes)**

Under **"Authorized redirect URIs"**, click **"+ ADD URI"** for each:

**URI 1 - For AWS Cognito Integration**:
```
https://serverless-auth-dev-auth.auth.ap-southeast-2.amazoncognito.com/oauth2/idpresponse
```

**URI 2 - For Your API Domain**:
```
https://api.filodelight.online/auth/google/callback
```

**Note**: Leave "Authorized JavaScript origins" empty (not needed for server-side OAuth)

4. Click **"CREATE"** button

##### Step 7: Save Your Credentials
**📋 Copy these immediately (you won't see the secret again!)**

1. **Client ID**: 
   ```
   Example: 776447891061-xxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
   ```

2. **Client Secret**:
   ```
   Example: GOCSPX-xxxxxxxxxxxxxxxxxxxx
   ```

3. Click **"OK"** to close the popup

### 1. Deploy Infrastructure

After DNS propagation is complete:

```bash
# Update domain in variables.tf
# root_domain = "your-purchased-domain.com" 
# api_subdomain = "api"  # Creates api.your-domain.com

# Initialize Terraform
terraform init

# Review the deployment plan  
terraform plan

# Deploy the infrastructure
terraform apply
```

### 2. Configure Terraform Variables

Create `terraform.tfvars` with your sensitive credentials:

```bash
# Create the file (or copy from example)
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with **ONLY sensitive values**:

```hcl
# Google OAuth Credentials (from Step 7 above)
google_client_id     = "YOUR-CLIENT-ID.apps.googleusercontent.com"
google_client_secret = "YOUR-CLIENT-SECRET"

# Alert Email Addresses
security_alert_email = "your-email@example.com"
system_alert_email   = "your-email@example.com"
```

**Note**: Domain and other non-sensitive configs are already set in `variables.tf`

### 3. Update Frontend Configuration

Update the API URL in `frontend-auth/.env` with your domain:

```env
REACT_APP_API_URL=https://api.your-domain.com
```

### 4. Build and Deploy Frontend

```bash
cd frontend-auth
npm install
npm run build

# Deploy to S3/CloudFront (automated via CI/CD)
```

## 📁 Project Structure

```
serverless-auth-cognito/
├── lambda_functions/           # Secure Lambda functions
│   ├── signin/                # HttpOnly cookie creation
│   ├── verify_token/          # Cookie-based authentication
│   ├── user_info/            # User data retrieval via cookies  
│   ├── refresh/              # Automatic token refresh
│   ├── logout/               # Secure cookie clearing
│   └── shared/               # Security utilities
├── frontend-auth/             # React application
│   ├── src/
│   │   ├── components/       # Protected route components
│   │   ├── services/         # HttpOnly cookie auth service
│   │   ├── store/            # Redux authentication state
│   │   └── config/           # API endpoint configuration
├── *.tf                      # Terraform infrastructure
├── route53.tf               # Custom domain configuration
└── README.md               # This documentation
```

## 🛡️ Security Implementation Details

### HttpOnly Cookie Authentication Flow

#### 1. Sign In Process
```
User credentials → Frontend → API Gateway → Lambda (signin)
                                        ↓
Lambda creates JWT tokens → Sets httpOnly cookies → Browser stores securely
                                                  ↓
Frontend receives success (no token data) → Redirects to dashboard
```

#### 2. Authenticated Requests
```
Frontend API call → Browser auto-includes httpOnly cookies → API Gateway
                                                           ↓
Lambda extracts tokens from cookies → Validates with Cognito → Returns data
```

#### 3. Page Refresh Authentication
```
Page loads → ProtectedRoute (800ms delay) → Authentication check (500ms buffer)
                                         ↓
Verify-token API call with cookies → Lambda validates → Authentication confirmed
```

#### 4. Automatic Token Refresh
```
API returns 401 → Axios interceptor triggers → Refresh API call
                                            ↓
Lambda uses refresh token from cookie → Issues new tokens → Updates cookies
                                     ↓
Retries original request with fresh tokens
```

### Security Code Implementation

#### Frontend (authService.js)
```javascript
// All requests automatically include httpOnly cookies
axios.defaults.withCredentials = true;

// Authentication via API call (tokens invisible to JS)
async isAuthenticated() {
  const response = await axios.get('/auth/verify-token');
  return response.status === 200;
}
```

#### Backend (Lambda Functions)
```python
# Secure cookie creation
create_cookie('accessToken', token, 
              http_only=True,      # XSS protection
              secure=True,         # HTTPS only
              same_site='Strict')  # CSRF protection

# Cookie extraction from headers
cookies = headers.get('Cookie', '')
access_token = extract_token_from_cookies(cookies)
```

## 📊 API Endpoints

### Authentication Endpoints
- `POST /auth/signup` - Register with email verification
- `POST /auth/signin` - Secure login with httpOnly cookie creation  
- `GET /auth/google` - **Initiate Google OAuth flow**
- `GET /auth/google/callback` - **Handle Google OAuth callback**
- `POST /auth/verify` - Email verification
- `POST /auth/forgot-password` - Password reset request
- `POST /auth/reset-password` - Secure password reset
- `POST /auth/refresh` - Automatic token refresh via cookies
- `POST /auth/logout` - Secure cookie clearing

### Protected Endpoints
- `GET /auth/verify-token` - Authentication verification (uses cookies)
- `GET /auth/user-info` - User profile data (uses cookies)

## 🔧 Environment Variables

### Lambda Functions
```env
COGNITO_CLIENT_ID=your-cognito-client-id
COGNITO_USER_POOL_ID=your-user-pool-id
USERS_TABLE=your-dynamodb-table
CORS_ALLOW_ORIGIN=https://filodelight.online
```

### Frontend
```env
REACT_APP_API_URL=https://api.filodelight.online
```

## 🚀 Production Deployment

### Infrastructure Components
- **AWS Cognito**: User pool and app client
- **API Gateway**: Custom domain with SSL certificate
- **Lambda Functions**: Python 3.12 with shared layers
- **Route53**: DNS records for custom domains
- **CloudFront**: Frontend distribution with custom domain
- **ACM Certificates**: SSL/TLS certificates for both domains

### Deployed URLs
- **Application**: https://filodelight.online
- **API**: https://api.filodelight.online
- **Status**: ✅ Live and operational

## 🔍 Security Benefits

### XSS Attack Prevention
- **Traditional Risk**: Malicious scripts steal tokens from localStorage
- **HttpOnly Solution**: Tokens completely invisible to JavaScript
- **Result**: Zero token exposure to XSS attacks

### CSRF Attack Prevention
- **Traditional Risk**: Cross-site requests use victim's stored tokens
- **SameSite=Strict Solution**: Cookies only sent with same-domain requests
- **Result**: Complete CSRF attack prevention

### Token Interception Prevention
- **Traditional Risk**: Network sniffing captures tokens in transit
- **Secure Flag Solution**: HTTPS-only cookie transmission
- **Result**: Encrypted token transmission always

## 📈 Performance Characteristics

### Authentication Performance
- **Initial Load**: ~800ms authentication verification
- **Page Refresh**: ~1.3s secure cookie verification  
- **Subsequent Requests**: Zero authentication overhead
- **Token Refresh**: Automatic and transparent to users

### Scalability Features
- **Serverless Architecture**: Automatic scaling with demand
- **CDN Distribution**: Global content delivery
- **Stateless Design**: No server-side session storage required
- **Efficient Caching**: Optimized API Gateway and CloudFront caching

## 🛠️ Development

### Local Development Setup
```bash
# Frontend development
cd frontend-auth
npm install
npm start

# Lambda function testing
cd lambda_functions/signin
python -m pytest tests/

# Infrastructure changes
terraform plan
terraform apply
```

### Testing Authentication
1. **Sign Up**: Create account with email verification
2. **Sign In**: Verify httpOnly cookies are set (DevTools → Application → Cookies)
3. **Google Sign-In**: Test OAuth flow with Google account
4. **Page Refresh**: Confirm authentication persists
5. **Logout**: Verify cookies are cleared
6. **Expired Tokens**: Test automatic refresh functionality

## 🔧 Troubleshooting

### Google OAuth Issues

#### "Error 400: redirect_uri_mismatch"
**Problem**: The redirect URI doesn't match what's configured in Google Console

**Solution**:
1. Check URIs in Google Console match EXACTLY (no trailing slashes)
2. Verify both URIs are added:
   - `https://serverless-auth-dev-auth.auth.ap-southeast-2.amazoncognito.com/oauth2/idpresponse`
   - `https://api.filodelight.online/auth/google/callback`
3. Wait 5-10 minutes for Google changes to propagate

#### "Google Sign-In button doesn't work"
**Problem**: Clicking the button does nothing or shows error

**Solution**:
1. Check browser console for errors
2. Verify API URL in `.env` is correct: `https://api.filodelight.online`
3. Rebuild frontend after changes: `npm run build`
4. Clear browser cache and cookies

#### "Invalid Client" error from Google
**Problem**: Google OAuth credentials are incorrect

**Solution**:
1. Verify `terraform.tfvars` has correct Client ID and Secret
2. Run `terraform apply` to update infrastructure
3. Check credentials match exactly (no extra spaces)

#### "User not found after Google Sign-In"
**Problem**: Google user not synced with Cognito

**Solution**:
1. First Google sign-in creates new Cognito user automatically
2. Check Cognito User Pool in AWS Console for the user
3. Verify Google identity provider is configured in Cognito

### Domain/Cookie Issues

#### Cookies not being set
**Problem**: Authentication works but cookies aren't visible

**Solution**:
1. Check you're using HTTPS (not HTTP)
2. Verify domain configuration in Terraform
3. Check API Gateway custom domain is active
4. Cookies are httpOnly - they won't show in JavaScript console

## 🔒 Security Compliance

### Industry Standards
- ✅ **OWASP Top 10**: Protection against all top web vulnerabilities
- ✅ **Zero Token Storage**: No sensitive data in browser storage
- ✅ **Transport Security**: End-to-end HTTPS encryption
- ✅ **Same-Origin Policy**: Strict domain-based security

### Enterprise Security Features
- ✅ **HttpOnly Cookies**: Industry-standard secure token storage
- ✅ **CSRF Protection**: SameSite=Strict implementation
- ✅ **XSS Immunity**: Zero JavaScript token exposure
- ✅ **Secure Transport**: HTTPS-only cookie transmission
- ✅ **Activity Monitoring**: Comprehensive authentication logging
- ✅ **Session Management**: Automatic timeout and refresh

---

## 🎯 Key Achievements

This implementation delivers **enterprise-grade authentication security** with:
- 🔒 **Zero XSS vulnerability** through httpOnly cookies
- 🛡️ **Complete CSRF protection** via SameSite=Strict
- ⚡ **Seamless user experience** with optimized timing
- 🚀 **Production-ready scalability** on AWS serverless infrastructure
- 📊 **Comprehensive monitoring** and error handling

The system is **live and operational** at `https://filodelight.online` with maximum security and optimal performance.