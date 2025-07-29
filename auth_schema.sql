-- =====================================================
-- AUTHENTICATION SYSTEM FOR CHURCH MANAGEMENT PLATFORM
-- =====================================================
-- Designed for elderly-friendly authentication with enterprise security
-- Supports magic links, device trust, and multi-church access

-- =====================================================
-- AUTHENTICATION TABLES
-- =====================================================

-- Enhanced users table with better authentication support
ALTER TABLE church_platform.users 
ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS preferred_auth_method VARCHAR(50) DEFAULT 'magic_link' 
    CHECK (preferred_auth_method IN ('magic_link', 'password', 'sms_pin', 'social')),
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
ADD COLUMN IF NOT EXISTS locale VARCHAR(10) DEFAULT 'en-US',
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50),
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": false}';

-- Magic link authentication tokens
CREATE TABLE IF NOT EXISTS church_platform.auth_magic_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email VARCHAR(255) NOT NULL,
    church_id UUID REFERENCES church_platform.churches(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    token_hash VARCHAR(255) NOT NULL, -- For secure lookups
    purpose VARCHAR(50) NOT NULL CHECK (purpose IN ('login', 'signup', 'verify_email', 'family_invite')),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_magic_links_token_hash (token_hash),
    INDEX idx_magic_links_email (user_email, church_id),
    INDEX idx_magic_links_expires (expires_at) WHERE used_at IS NULL
);

-- Device trust and recognition
CREATE TABLE IF NOT EXISTS church_platform.trusted_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES church_platform.users(id) ON DELETE CASCADE,
    device_fingerprint VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    device_type VARCHAR(50) CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
    browser VARCHAR(100),
    operating_system VARCHAR(100),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_ip_address INET,
    trust_score NUMERIC(3,2) DEFAULT 0.50, -- 0-1 confidence score
    is_trusted BOOLEAN DEFAULT false,
    trusted_at TIMESTAMPTZ,
    trusted_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, device_fingerprint),
    INDEX idx_trusted_devices_user (user_id),
    INDEX idx_trusted_devices_fingerprint (device_fingerprint)
);

-- SMS PIN authentication
CREATE TABLE IF NOT EXISTS church_platform.auth_sms_pins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(50) NOT NULL,
    church_id UUID REFERENCES church_platform.churches(id) ON DELETE CASCADE,
    pin_hash VARCHAR(255) NOT NULL,
    attempts INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_sms_pins_phone (phone, church_id),
    INDEX idx_sms_pins_expires (expires_at) WHERE used_at IS NULL
);

-- User sessions with enhanced tracking
CREATE TABLE IF NOT EXISTS church_platform.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES church_platform.users(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES church_platform.churches(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    device_id UUID REFERENCES church_platform.trusted_devices(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    login_method VARCHAR(50),
    location_city VARCHAR(100),
    location_country VARCHAR(2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_sessions_token (session_token),
    INDEX idx_sessions_user (user_id, church_id),
    INDEX idx_sessions_active (user_id, is_active),
    INDEX idx_sessions_expires (expires_at) WHERE is_active = true
);

-- Multi-church access management
CREATE TABLE IF NOT EXISTS church_platform.user_church_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES church_platform.users(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES church_platform.churches(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'admin', 'staff', 'volunteer', 'member', 'visitor')),
    permissions JSONB DEFAULT '{}',
    is_primary_church BOOLEAN DEFAULT false,
    invited_by UUID REFERENCES church_platform.users(id),
    invited_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, church_id),
    INDEX idx_user_church_access_user (user_id),
    INDEX idx_user_church_access_church (church_id)
);

-- Family account relationships
CREATE TABLE IF NOT EXISTS church_platform.family_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID NOT NULL REFERENCES church_platform.churches(id) ON DELETE CASCADE,
    household_id UUID REFERENCES church_platform.households(id) ON DELETE CASCADE,
    primary_user_id UUID NOT NULL REFERENCES church_platform.users(id) ON DELETE CASCADE,
    family_name VARCHAR(255),
    family_code VARCHAR(20) UNIQUE, -- For easy family member additions
    settings JSONB DEFAULT '{"parental_controls": false, "shared_giving": true}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_family_accounts_church (church_id),
    INDEX idx_family_accounts_code (family_code)
);

-- Family member connections
CREATE TABLE IF NOT EXISTS church_platform.family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_account_id UUID NOT NULL REFERENCES church_platform.family_accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES church_platform.users(id) ON DELETE CASCADE,
    person_id UUID REFERENCES church_platform.people(id) ON DELETE CASCADE,
    relationship VARCHAR(50) CHECK (relationship IN ('parent', 'child', 'spouse', 'guardian', 'other')),
    can_manage_family BOOLEAN DEFAULT false,
    parental_approval_required BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(family_account_id, user_id),
    INDEX idx_family_members_family (family_account_id),
    INDEX idx_family_members_user (user_id)
);

-- Authentication rate limiting
CREATE TABLE IF NOT EXISTS church_platform.auth_rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier VARCHAR(255) NOT NULL, -- Email, IP, or phone
    identifier_type VARCHAR(50) NOT NULL CHECK (identifier_type IN ('email', 'ip', 'phone')),
    action VARCHAR(50) NOT NULL CHECK (action IN ('login', 'magic_link', 'sms_pin', 'password_reset')),
    attempts INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    blocked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(identifier, identifier_type, action),
    INDEX idx_rate_limits_identifier (identifier, identifier_type),
    INDEX idx_rate_limits_blocked (blocked_until) WHERE blocked_until IS NOT NULL
);

-- Security audit log for authentication events
CREATE TABLE IF NOT EXISTS church_platform.auth_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES church_platform.users(id) ON DELETE SET NULL,
    church_id UUID REFERENCES church_platform.churches(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL CHECK (event_type IN (
        'login_success', 'login_failed', 'logout', 'magic_link_sent', 'magic_link_used',
        'password_changed', 'password_reset', 'sms_pin_sent', 'sms_pin_verified',
        'device_trusted', 'device_untrusted', 'account_locked', 'account_unlocked',
        'permissions_changed', 'church_access_granted', 'church_access_revoked',
        'family_member_added', 'family_member_removed', 'suspicious_activity'
    )),
    event_details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    risk_score NUMERIC(3,2), -- 0-1, higher = more risky
    created_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_auth_audit_user (user_id),
    INDEX idx_auth_audit_church (church_id),
    INDEX idx_auth_audit_event (event_type),
    INDEX idx_auth_audit_created (created_at),
    INDEX idx_auth_audit_risk (risk_score) WHERE risk_score > 0.7
);

-- Privacy consent tracking
CREATE TABLE IF NOT EXISTS church_platform.privacy_consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES church_platform.users(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES church_platform.churches(id) ON DELETE CASCADE,
    consent_type VARCHAR(100) NOT NULL CHECK (consent_type IN (
        'terms_of_service', 'privacy_policy', 'email_marketing', 'sms_marketing',
        'directory_listing', 'photo_usage', 'data_sharing', 'analytics'
    )),
    consented BOOLEAN NOT NULL,
    consent_text TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    UNIQUE(user_id, church_id, consent_type),
    INDEX idx_privacy_consents_user (user_id, church_id),
    INDEX idx_privacy_consents_type (consent_type)
);

-- Member directory privacy settings
CREATE TABLE IF NOT EXISTS church_platform.directory_privacy (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID NOT NULL REFERENCES church_platform.people(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES church_platform.churches(id) ON DELETE CASCADE,
    is_listed BOOLEAN DEFAULT true,
    show_email BOOLEAN DEFAULT true,
    show_phone BOOLEAN DEFAULT false,
    show_address BOOLEAN DEFAULT false,
    show_birthday BOOLEAN DEFAULT false,
    show_family_members BOOLEAN DEFAULT true,
    show_groups BOOLEAN DEFAULT true,
    visible_to_roles TEXT[] DEFAULT ARRAY['member', 'staff', 'admin'],
    custom_visibility_rules JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(person_id, church_id),
    INDEX idx_directory_privacy_person (person_id),
    INDEX idx_directory_privacy_church (church_id)
);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to clean up expired authentication tokens
CREATE OR REPLACE FUNCTION church_platform.cleanup_expired_auth_tokens()
RETURNS void AS $$
BEGIN
    -- Clean up expired magic links
    DELETE FROM church_platform.auth_magic_links 
    WHERE expires_at < NOW() AND used_at IS NULL;
    
    -- Clean up expired SMS pins
    DELETE FROM church_platform.auth_sms_pins 
    WHERE expires_at < NOW() AND used_at IS NULL;
    
    -- Clean up expired sessions
    UPDATE church_platform.user_sessions 
    SET is_active = false 
    WHERE expires_at < NOW() AND is_active = true;
    
    -- Clean up old rate limit records
    DELETE FROM church_platform.auth_rate_limits 
    WHERE window_start < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Function to calculate device trust score
CREATE OR REPLACE FUNCTION church_platform.calculate_device_trust_score(
    p_device_id UUID
)
RETURNS NUMERIC AS $$
DECLARE
    v_base_score NUMERIC := 0.5;
    v_days_since_created INTEGER;
    v_successful_logins INTEGER;
    v_suspicious_activities INTEGER;
    v_final_score NUMERIC;
BEGIN
    -- Get device age
    SELECT EXTRACT(DAY FROM NOW() - created_at)
    INTO v_days_since_created
    FROM church_platform.trusted_devices
    WHERE id = p_device_id;
    
    -- Count successful logins from this device
    SELECT COUNT(*)
    INTO v_successful_logins
    FROM church_platform.auth_audit_log
    WHERE device_fingerprint = (
        SELECT device_fingerprint 
        FROM church_platform.trusted_devices 
        WHERE id = p_device_id
    )
    AND event_type = 'login_success';
    
    -- Count suspicious activities
    SELECT COUNT(*)
    INTO v_suspicious_activities
    FROM church_platform.auth_audit_log
    WHERE device_fingerprint = (
        SELECT device_fingerprint 
        FROM church_platform.trusted_devices 
        WHERE id = p_device_id
    )
    AND event_type IN ('login_failed', 'suspicious_activity')
    AND created_at > NOW() - INTERVAL '30 days';
    
    -- Calculate score
    v_final_score := v_base_score;
    
    -- Increase score for device age (max +0.2)
    v_final_score := v_final_score + LEAST(v_days_since_created / 180.0 * 0.2, 0.2);
    
    -- Increase score for successful logins (max +0.2)
    v_final_score := v_final_score + LEAST(v_successful_logins / 20.0 * 0.2, 0.2);
    
    -- Decrease score for suspicious activities
    v_final_score := v_final_score - (v_suspicious_activities * 0.1);
    
    -- Ensure score is between 0 and 1
    RETURN GREATEST(0, LEAST(1, v_final_score));
END;
$$ LANGUAGE plpgsql;

-- Function to check rate limits
CREATE OR REPLACE FUNCTION church_platform.check_rate_limit(
    p_identifier VARCHAR(255),
    p_identifier_type VARCHAR(50),
    p_action VARCHAR(50),
    p_max_attempts INTEGER DEFAULT 5,
    p_window_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN AS $$
DECLARE
    v_attempts INTEGER;
    v_blocked_until TIMESTAMPTZ;
BEGIN
    -- Check if currently blocked
    SELECT blocked_until INTO v_blocked_until
    FROM church_platform.auth_rate_limits
    WHERE identifier = p_identifier
    AND identifier_type = p_identifier_type
    AND action = p_action;
    
    IF v_blocked_until IS NOT NULL AND v_blocked_until > NOW() THEN
        RETURN FALSE;
    END IF;
    
    -- Count recent attempts
    SELECT attempts INTO v_attempts
    FROM church_platform.auth_rate_limits
    WHERE identifier = p_identifier
    AND identifier_type = p_identifier_type
    AND action = p_action
    AND window_start > NOW() - INTERVAL '1 minute' * p_window_minutes;
    
    IF v_attempts IS NULL THEN
        -- First attempt
        INSERT INTO church_platform.auth_rate_limits (
            identifier, identifier_type, action, attempts
        ) VALUES (
            p_identifier, p_identifier_type, p_action, 1
        )
        ON CONFLICT (identifier, identifier_type, action) 
        DO UPDATE SET 
            attempts = 1,
            window_start = NOW();
        RETURN TRUE;
    ELSIF v_attempts < p_max_attempts THEN
        -- Increment attempts
        UPDATE church_platform.auth_rate_limits
        SET attempts = attempts + 1
        WHERE identifier = p_identifier
        AND identifier_type = p_identifier_type
        AND action = p_action;
        RETURN TRUE;
    ELSE
        -- Block for progressive duration
        UPDATE church_platform.auth_rate_limits
        SET blocked_until = NOW() + INTERVAL '1 minute' * (v_attempts * 2)
        WHERE identifier = p_identifier
        AND identifier_type = p_identifier_type
        AND action = p_action;
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user last_login_at
CREATE OR REPLACE FUNCTION church_platform.update_user_last_login()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.event_type = 'login_success' AND NEW.user_id IS NOT NULL THEN
        UPDATE church_platform.users
        SET last_login_at = NOW()
        WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_last_login
AFTER INSERT ON church_platform.auth_audit_log
FOR EACH ROW
EXECUTE FUNCTION church_platform.update_user_last_login();

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on authentication tables
ALTER TABLE church_platform.auth_magic_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE church_platform.trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE church_platform.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE church_platform.user_church_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE church_platform.family_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE church_platform.directory_privacy ENABLE ROW LEVEL SECURITY;

-- Users can only see their own authentication data
CREATE POLICY user_own_devices ON church_platform.trusted_devices
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY user_own_sessions ON church_platform.user_sessions
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::UUID);

-- Church isolation for family accounts
CREATE POLICY church_isolation ON church_platform.family_accounts
    FOR ALL
    USING (church_id = current_setting('app.current_church_id')::UUID);

-- Privacy settings respect user preferences
CREATE POLICY privacy_isolation ON church_platform.directory_privacy
    FOR ALL
    USING (
        church_id = current_setting('app.current_church_id')::UUID
        AND (
            person_id IN (
                SELECT person_id FROM church_platform.users 
                WHERE id = current_setting('app.current_user_id')::UUID
            )
            OR current_setting('app.current_user_role') IN ('admin', 'staff')
        )
    );

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Composite indexes for common queries
CREATE INDEX idx_user_church_primary ON church_platform.user_church_access(user_id, is_primary_church) 
    WHERE is_primary_church = true;

CREATE INDEX idx_sessions_recent_activity ON church_platform.user_sessions(user_id, last_activity_at DESC)
    WHERE is_active = true;

CREATE INDEX idx_auth_audit_recent ON church_platform.auth_audit_log(user_id, created_at DESC)
    WHERE created_at > NOW() - INTERVAL '30 days';

-- Partial indexes for active records
CREATE INDEX idx_trusted_devices_active ON church_platform.trusted_devices(user_id, trust_score DESC)
    WHERE is_trusted = true AND trusted_until > NOW();

CREATE INDEX idx_family_members_active ON church_platform.family_members(user_id)
    WHERE parental_approval_required = false;