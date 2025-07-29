# Church Management Platform Authentication System

## Overview

This authentication system is specifically designed for church management software with a focus on elderly-friendly user experience while maintaining enterprise-grade security. The system prioritizes ease of use ("check your email" is easier than "remember your password") with pastoral, welcoming language.

## Core Features

### 1. Magic Link Authentication (Primary Method)
- **Passwordless authentication** via secure email links
- **15-minute expiry** for security
- **Church-branded emails** with pastoral messaging
- **Automatic device trust** for returning users
- **Progressive recognition** with confidence scoring

### 2. SMS PIN Authentication (Phone-Only Users)
- **6-digit PIN** sent via SMS
- **5-minute expiry** for security
- **Designed for elderly users** who prefer phone-based authentication
- **Auto-formats phone numbers** internationally

### 3. Device Recognition & Trust
- **Automatic device fingerprinting** for security
- **90-day device trust** with remember me functionality
- **Progressive confidence scoring** (98% auto-fill, 85% suggest, 70% manual)
- **Device management** for users and admins

### 4. Multi-Church Support
- **Complete tenant isolation** with row-level security
- **Cross-church user access** for consultants/denominational staff
- **Church context switching** with separate sessions
- **Role-based permissions** per church

### 5. Family Account Management
- **Household authentication** linking
- **Family member detection** and management
- **Parental controls** for child accounts
- **Shared giving** and family settings

### 6. Privacy & Compliance
- **GDPR compliance** with consent tracking
- **Member directory privacy** controls
- **Data retention policies** respecting member preferences
- **Pastoral care data protection**

## Security Architecture

### Database Security
- **Row-Level Security (RLS)** enforcing church isolation
- **Encrypted sensitive data** with PostgreSQL pgcrypto
- **Audit trails** for all authentication events
- **Rate limiting** with progressive lockouts

### Session Management
- **90-day session expiry** with automatic renewal
- **Secure session tokens** (256-bit random)
- **Device-specific sessions** with fingerprinting
- **Session revocation** capabilities

### Anti-Abuse Protection
- **Progressive rate limiting** (5 attempts per 15 minutes)
- **IP-based and user-based** limiting
- **Suspicious activity detection** with risk scoring
- **Account lockout protection** with pastoral recovery

## API Endpoints

### Authentication Endpoints

#### `POST /api/auth/magic-link`
Send magic link for passwordless authentication.
```json
{
  "email": "member@church.com",
  "church_id": "uuid",
  "purpose": "login"
}
```

#### `POST /api/auth/verify-token`
Verify magic link token and create session.
```json
{
  "token": "secure_token_string"
}
```

#### `POST /api/auth/sms-pin`
Send SMS PIN for phone-based authentication.
```json
{
  "phone": "+1234567890",
  "church_id": "uuid"
}
```

#### `POST /api/auth/verify-sms`
Verify SMS PIN and create session.
```json
{
  "phone": "+1234567890",
  "pin": "123456",
  "church_id": "uuid"
}
```

#### `POST /api/auth/recognize-device`
Attempt device recognition for returning users.
- Returns confidence score and suggested email if recognized

#### `POST /api/auth/logout`
Logout user and invalidate session.

### Multi-Church Management

#### `POST /api/auth/churches/grant-access`
Grant user access to a church (admin only).
```json
{
  "user_id": "uuid",
  "church_id": "uuid",
  "role": "member",
  "permissions": {}
}
```

#### `POST /api/auth/churches/switch/{church_id}`
Switch to different church context.

### Family Account Management

#### `POST /api/auth/family/create`
Create family account with shareable code.
```json
{
  "family_name": "Smith Family",
  "household_id": "uuid"
}
```

#### `POST /api/auth/family/add-member`
Add member to family account.
```json
{
  "family_code": "FAITH-1234",
  "user_id": "uuid",
  "relationship": "child"
}
```

### Privacy Management

#### `POST /api/auth/privacy/consent`
Update privacy consent preferences.
```json
{
  "consent_type": "directory_listing",
  "consented": true
}
```

#### `POST /api/auth/privacy/directory`
Update member directory privacy settings.
```json
{
  "is_listed": true,
  "show_email": true,
  "show_phone": false,
  "visible_to_roles": ["member", "staff", "admin"]
}
```

## Database Schema

### Core Authentication Tables

#### `users`
- Enhanced user accounts with authentication preferences
- Links to person records for member data
- Multi-church access support

#### `auth_magic_links`
- Secure magic link tokens with expiry
- Purpose tracking (login, signup, verify_email, family_invite)
- Usage tracking and audit trail

#### `trusted_devices`
- Device fingerprinting and trust scoring
- 90-day trust periods with renewal
- Device metadata for security

#### `user_sessions`
- Active user sessions with device tracking
- Church context isolation
- Activity monitoring

#### `user_church_access`
- Multi-church permission management
- Role-based access control
- Primary church designation

#### `family_accounts` & `family_members`
- Family account linking
- Household authentication
- Parental control settings

#### `privacy_consents` & `directory_privacy`
- GDPR compliance tracking
- Member privacy preferences
- Granular visibility controls

### Security Tables

#### `auth_rate_limits`
- Rate limiting enforcement
- Progressive lockout periods
- Multiple identifier types (email, IP, phone)

#### `auth_audit_log`
- Comprehensive authentication event logging
- Risk scoring for suspicious activity
- Full audit trail for compliance

## Security Middleware

### SecurityMiddleware
- **CSRF protection** for form submissions
- **Security headers** (CSP, HSTS, etc.)
- **CORS handling** with allowed origins
- **Request ID tracking** for debugging

### RateLimitMiddleware
- **API rate limiting** (60/minute, 1000/hour)
- **Church-specific limits** for fair usage
- **Progressive backoff** for abuse prevention

### ChurchContextMiddleware
- **Row-level security** enforcement
- **Church isolation** for all queries
- **User context** setting for permissions

### AuditLoggingMiddleware
- **Request/response logging** for audit
- **Sensitive path protection** (no logging passwords/tokens)
- **Performance monitoring** with timing

## Configuration

### AuthConfig Options
```python
AuthConfig(
    magic_link_expiry_minutes=15,      # Magic link validity
    sms_pin_expiry_minutes=5,          # SMS PIN validity
    session_expiry_days=90,            # Session duration
    device_trust_days=90,              # Device trust period
    elderly_mode_enabled=True,         # Enhanced UX features
    auto_recognize_threshold=0.98,     # Auto-fill confidence
    suggest_recognize_threshold=0.85,  # Suggestion confidence
    rate_limit_max_attempts=5,         # Max attempts per window
    rate_limit_window_minutes=15       # Rate limit window
)
```

## User Experience Design

### Elderly-Friendly Features
- **Large, clear buttons** in email templates
- **Simple language** avoiding technical jargon
- **Pastoral messaging** with welcoming tone
- **Automatic device trust** reducing repeated authentication
- **SMS fallback** for phone-only users

### Progressive Recognition
- **98% confidence**: Auto-fill email, "Welcome back [name]!"
- **85% confidence**: Suggest email, "Is this you?"
- **Below 85%**: Manual entry required

### Error Messaging
- Clear, non-technical error messages
- Helpful suggestions for resolution
- "Contact church" fallbacks for complex issues

## Implementation Examples

### Magic Link Email Template
```html
<h2>Welcome back to [Church Name]!</h2>
<p>We're glad you're here. Click the button below to sign in:</p>
<a href="[magic_link]" style="...">Sign In to Your Account</a>
<p>This link expires in 15 minutes for your security.</p>
<p>Having trouble? Simply reply to this email and we'll help you sign in.</p>
```

### Device Recognition Flow
```python
# Check if device is recognized
result = await auth_service.recognize_user(device_info, church_id)

if result.confidence_score >= 0.98:
    # Auto-fill email field
    return {"suggested_email": result.suggested_email, "auto_fill": True}
elif result.confidence_score >= 0.85:
    # Show suggestion
    return {"suggested_email": result.suggested_email, "message": "Is this you?"}
else:
    # Manual entry required
    return {"message": "Please enter your email"}
```

### Family Account Creation
```python
# Create family account
family_code = await auth_service.create_family_account(
    church_id=church_id,
    primary_user_id=user_id,
    family_name="Smith Family",
    household_id=household_id
)

# Returns code like "FAITH-1234" for easy sharing
```

## Security Best Practices

### Token Security
- **Cryptographically secure** token generation
- **Short expiry times** (15 minutes for magic links)
- **Single-use tokens** with usage tracking
- **Secure hash storage** (SHA-256)

### Session Security
- **HttpOnly cookies** preventing XSS
- **Secure flag** for HTTPS-only transmission
- **SameSite protection** against CSRF
- **Regular session rotation**

### Database Security
- **Row-level security** policies for church isolation
- **Parameterized queries** preventing SQL injection
- **Encrypted sensitive data** using pgcrypto
- **Regular security updates** and patches

### Privacy Protection
- **Consent tracking** for GDPR compliance
- **Data minimization** - only collect necessary data
- **Right to deletion** support
- **Privacy by design** principles

## Monitoring & Alerts

### Key Metrics
- **Authentication success rates** by method
- **Device trust scores** and patterns
- **Rate limiting triggers** and patterns
- **Failed login attempts** and sources

### Security Alerts
- **Multiple failed logins** from same IP
- **Unusual device patterns** for users
- **Magic link abuse** (excessive requests)
- **Cross-church access** anomalies

### Performance Monitoring
- **Response times** for auth endpoints
- **Database query performance** for RLS
- **Email/SMS delivery** success rates
- **Session creation** and validation times

This authentication system provides enterprise-grade security while maintaining the user-friendly experience appropriate for church communities, especially elderly members who may not be technically savvy.