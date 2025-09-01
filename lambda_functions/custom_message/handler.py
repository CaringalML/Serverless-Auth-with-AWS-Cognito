import json

def lambda_handler(event, context):
    """
    Cognito Custom Message Trigger
    This function customizes email messages for verification and password reset
    """
    
    print(f"Custom message trigger called with event: {json.dumps(event, default=str)}")
    
    trigger_source = event.get('triggerSource')
    user_attributes = event.get('request', {}).get('userAttributes', {})
    project_name = "Serverless Auth"  # You can make this dynamic
    
    # Email verification messages
    if trigger_source == 'CustomMessage_SignUp':
        event['response']['emailSubject'] = f'Welcome to {project_name} - Verify Your Account'
        event['response']['emailMessage'] = f'''
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background: #fff; padding: 30px; border: 1px solid #e2e8f0; }}
        .code {{ font-size: 24px; font-weight: bold; color: #059669; text-align: center; background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; }}
        .footer {{ background: #f8fafc; padding: 20px; text-align: center; font-size: 14px; color: #64748b; border-radius: 0 0 8px 8px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{project_name}</h1>
            <p>Welcome! Please verify your account</p>
        </div>
        <div class="content">
            <h2>Your Verification Code</h2>
            <div class="code">{event['request']['codeParameter']}</div>
            <p>Please enter this code in the verification page to complete your registration.</p>
            <p><strong>This code expires in 24 hours.</strong></p>
        </div>
        <div class="footer">
            <p>If you didn't create an account, please ignore this email.</p>
            <p>© 2024 {project_name}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        '''
    
    # Password reset messages
    elif trigger_source == 'CustomMessage_ForgotPassword':
        event['response']['emailSubject'] = f'{project_name} - Password Reset Code'
        event['response']['emailMessage'] = f'''
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background: #fff; padding: 30px; border: 1px solid #e2e8f0; }}
        .code {{ font-size: 24px; font-weight: bold; color: #1d4ed8; text-align: center; background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; }}
        .warning {{ background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin: 20px 0; }}
        .footer {{ background: #f8fafc; padding: 20px; text-align: center; font-size: 14px; color: #64748b; border-radius: 0 0 8px 8px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{project_name}</h1>
            <p>Password Reset Request</p>
        </div>
        <div class="content">
            <div class="warning">
                <h3>⚠️ Password Reset Requested</h3>
                <p>Someone requested a password reset for your account. If this wasn't you, please ignore this email.</p>
            </div>
            <h2>Your Reset Code</h2>
            <div class="code">{event['request']['codeParameter']}</div>
            <p>Use this code to reset your password. <strong>This code expires in 1 hour for security.</strong></p>
            <h3>How to reset your password:</h3>
            <ol>
                <li>Copy the code above</li>
                <li>Return to the password reset page</li>
                <li>Enter the code and your new password</li>
                <li>Click "Reset Password" to complete</li>
            </ol>
        </div>
        <div class="footer">
            <p>For security, this code will expire in 1 hour.</p>
            <p>© 2024 {project_name}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        '''
    
    # Admin create user messages
    elif trigger_source == 'CustomMessage_AdminCreateUser':
        event['response']['emailSubject'] = f'Welcome to {project_name} - Set Up Your Account'
        event['response']['emailMessage'] = f'''
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background: #fff; padding: 30px; border: 1px solid #e2e8f0; }}
        .code {{ font-size: 20px; font-weight: bold; color: #7c3aed; text-align: center; background: #faf5ff; padding: 20px; border-radius: 8px; margin: 20px 0; }}
        .footer {{ background: #f8fafc; padding: 20px; text-align: center; font-size: 14px; color: #64748b; border-radius: 0 0 8px 8px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{project_name}</h1>
            <p>Your account has been created</p>
        </div>
        <div class="content">
            <h2>Welcome to {project_name}!</h2>
            <p>An administrator has created an account for you. Please use the temporary password below to log in and set up your account.</p>
            <div class="code">
                <strong>Username:</strong> {user_attributes.get('email', 'N/A')}<br>
                <strong>Temporary Password:</strong> {event['request']['codeParameter']}
            </div>
            <p><strong>Important:</strong> You'll be required to change this password on your first login.</p>
        </div>
        <div class="footer">
            <p>Please log in within 7 days to activate your account.</p>
            <p>© 2024 {project_name}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        '''
    
    # Resend confirmation code
    elif trigger_source == 'CustomMessage_ResendCode':
        event['response']['emailSubject'] = f'{project_name} - New Verification Code'
        event['response']['emailMessage'] = f'''
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background: #fff; padding: 30px; border: 1px solid #e2e8f0; }}
        .code {{ font-size: 24px; font-weight: bold; color: #059669; text-align: center; background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; }}
        .footer {{ background: #f8fafc; padding: 20px; text-align: center; font-size: 14px; color: #64748b; border-radius: 0 0 8px 8px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{project_name}</h1>
            <p>New Verification Code</p>
        </div>
        <div class="content">
            <h2>Your New Verification Code</h2>
            <div class="code">{event['request']['codeParameter']}</div>
            <p>You requested a new verification code. Please enter this code to complete your registration.</p>
            <p><strong>This code expires in 24 hours.</strong></p>
        </div>
        <div class="footer">
            <p>If you didn't request this code, please ignore this email.</p>
            <p>© 2024 {project_name}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        '''
    
    return event