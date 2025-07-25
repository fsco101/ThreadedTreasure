# Mailtrap Email Configuration Example
# Add these variables to your .env file

# =================================
# MAILTRAP CONFIGURATION
# =================================
# Sign up at https://mailtrap.io for email testing
MAILTRAP_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_PORT=2525
MAILTRAP_USERNAME=your_mailtrap_username_here
MAILTRAP_PASSWORD=your_mailtrap_password_here
MAILTRAP_FROM=noreply@threadedtreasure.com

# =================================
# ALTERNATIVE: GMAIL CONFIGURATION
# =================================
# If you prefer to use Gmail instead of Mailtrap:
# EMAIL_USER=your-gmail@gmail.com
# EMAIL_PASSWORD=your-gmail-app-password

# =================================
# HOW TO SET UP MAILTRAP:
# =================================
# 1. Go to https://mailtrap.io
# 2. Sign up for a free account
# 3. Create a new inbox
# 4. Copy the SMTP credentials from your inbox
# 5. Add the credentials to your .env file
# 6. All emails will be captured in Mailtrap for testing
