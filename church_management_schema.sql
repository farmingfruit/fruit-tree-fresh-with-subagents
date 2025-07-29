-- Church Management Platform Database Schema
-- Designed for multi-tenant SaaS with AI-first features
-- PostgreSQL 15+ recommended for advanced JSONB and vector support

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS "vector"; -- For AI embeddings

-- Create schema for better organization
CREATE SCHEMA IF NOT EXISTS church_platform;
SET search_path TO church_platform, public;

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Churches (Tenants)
CREATE TABLE churches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'trial')),
    plan_type VARCHAR(50) DEFAULT 'starter' CHECK (plan_type IN ('starter', 'growth', 'enterprise')),
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    country VARCHAR(2) DEFAULT 'US',
    currency VARCHAR(3) DEFAULT 'USD',
    settings JSONB DEFAULT '{}',
    ai_features JSONB DEFAULT '{"sermon_transcription": true, "member_insights": true, "predictive_analytics": false}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    trial_ends_at TIMESTAMPTZ,
    subscription_ends_at TIMESTAMPTZ
);

CREATE INDEX idx_churches_subdomain ON churches(subdomain);
CREATE INDEX idx_churches_status ON churches(status) WHERE status = 'active';
CREATE INDEX idx_churches_settings ON churches USING GIN(settings);

-- Church Locations/Campuses
CREATE TABLE church_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(2) DEFAULT 'US',
    phone VARCHAR(50),
    email VARCHAR(255),
    coordinates POINT,
    timezone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(church_id, name)
);

CREATE INDEX idx_church_locations_church_id ON church_locations(church_id);
CREATE INDEX idx_church_locations_coordinates ON church_locations USING GIST(coordinates);

-- =====================================================
-- PEOPLE & RELATIONSHIPS
-- =====================================================

-- People (Members, Visitors, etc.)
CREATE TABLE people (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    external_id VARCHAR(100), -- For integrations
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    nickname VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile_phone VARCHAR(50),
    birth_date DATE,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    marital_status VARCHAR(50) CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed', 'separated')),
    membership_status VARCHAR(50) DEFAULT 'visitor' CHECK (membership_status IN ('visitor', 'regular_attendee', 'member', 'inactive', 'transferred', 'deceased')),
    membership_date DATE,
    baptism_date DATE,
    baptism_location VARCHAR(255),
    photo_url TEXT,
    occupation VARCHAR(255),
    employer VARCHAR(255),
    skills TEXT[],
    interests TEXT[],
    allergies TEXT[],
    medical_notes TEXT,
    custom_fields JSONB DEFAULT '{}',
    ai_embeddings vector(1536), -- For AI similarity searches
    ai_profile JSONB DEFAULT '{}', -- AI-generated insights
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_attendance_date DATE,
    first_visit_date DATE,
    UNIQUE(church_id, email)
);

CREATE INDEX idx_people_church_id ON people(church_id);
CREATE INDEX idx_people_email ON people(church_id, email) WHERE email IS NOT NULL;
CREATE INDEX idx_people_phone ON people(church_id, phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_people_name ON people(church_id, last_name, first_name);
CREATE INDEX idx_people_membership_status ON people(church_id, membership_status);
CREATE INDEX idx_people_tags ON people USING GIN(tags);
CREATE INDEX idx_people_custom_fields ON people USING GIN(custom_fields);
CREATE INDEX idx_people_ai_embeddings ON people USING ivfflat (ai_embeddings vector_cosine_ops);
CREATE INDEX idx_people_search ON people USING GIN(
    (first_name || ' ' || last_name || ' ' || COALESCE(nickname, '')) gin_trgm_ops
);

-- Households/Families
CREATE TABLE households (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(2) DEFAULT 'US',
    home_phone VARCHAR(50),
    preferred_contact_method VARCHAR(50) DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'phone', 'sms', 'mail')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_households_church_id ON households(church_id);

-- Household Members (Relationship mapping)
CREATE TABLE household_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL CHECK (relationship_type IN ('head', 'spouse', 'child', 'parent', 'grandparent', 'other')),
    is_primary_contact BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(household_id, person_id)
);

CREATE INDEX idx_household_members_household ON household_members(household_id);
CREATE INDEX idx_household_members_person ON household_members(person_id);

-- Member Status History
CREATE TABLE member_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    reason TEXT,
    changed_by UUID,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_member_status_history_person ON member_status_history(person_id);
CREATE INDEX idx_member_status_history_date ON member_status_history(changed_at);

-- =====================================================
-- GROUPS & MINISTRIES
-- =====================================================

-- Groups (Small groups, ministries, classes, etc.)
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    location_id UUID REFERENCES church_locations(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    group_type VARCHAR(50) NOT NULL CHECK (group_type IN ('small_group', 'ministry', 'class', 'committee', 'team', 'other')),
    category VARCHAR(100),
    is_public BOOLEAN DEFAULT true,
    max_members INTEGER,
    meeting_day VARCHAR(20),
    meeting_time TIME,
    meeting_frequency VARCHAR(50), -- weekly, biweekly, monthly
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_groups_church_id ON groups(church_id);
CREATE INDEX idx_groups_type ON groups(church_id, group_type);
CREATE INDEX idx_groups_active ON groups(church_id, is_active);

-- Group Members
CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('leader', 'co-leader', 'member', 'visitor')),
    joined_date DATE DEFAULT CURRENT_DATE,
    left_date DATE,
    is_active BOOLEAN DEFAULT true,
    attendance_percentage NUMERIC(5,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, person_id)
);

CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_person ON group_members(person_id);
CREATE INDEX idx_group_members_active ON group_members(group_id, is_active);

-- =====================================================
-- EVENTS & ATTENDANCE
-- =====================================================

-- Events (Services, meetings, special events)
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    location_id UUID REFERENCES church_locations(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('service', 'class', 'meeting', 'special', 'conference', 'other')),
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN DEFAULT false,
    recurrence_rule TEXT, -- iCal RRULE format
    recurrence_parent_id UUID REFERENCES events(id) ON DELETE CASCADE,
    capacity INTEGER,
    registration_required BOOLEAN DEFAULT false,
    registration_deadline TIMESTAMPTZ,
    is_public BOOLEAN DEFAULT true,
    is_online BOOLEAN DEFAULT false,
    online_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_church_id ON events(church_id);
CREATE INDEX idx_events_datetime ON events(church_id, start_datetime);
CREATE INDEX idx_events_type ON events(church_id, event_type);
CREATE INDEX idx_events_recurrence ON events(recurrence_parent_id) WHERE recurrence_parent_id IS NOT NULL;

-- Event Attendance
CREATE TABLE event_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    check_in_time TIMESTAMPTZ DEFAULT NOW(),
    check_out_time TIMESTAMPTZ,
    attendance_type VARCHAR(50) DEFAULT 'in_person' CHECK (attendance_type IN ('in_person', 'online', 'hybrid')),
    checked_in_by UUID REFERENCES people(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, person_id)
);

CREATE INDEX idx_event_attendance_event ON event_attendance(event_id);
CREATE INDEX idx_event_attendance_person ON event_attendance(person_id);
CREATE INDEX idx_event_attendance_checkin ON event_attendance(check_in_time);

-- Attendance Analytics (Aggregated for performance)
CREATE TABLE attendance_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    location_id UUID REFERENCES church_locations(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    event_type VARCHAR(50),
    total_attendance INTEGER DEFAULT 0,
    first_time_visitors INTEGER DEFAULT 0,
    returning_visitors INTEGER DEFAULT 0,
    members INTEGER DEFAULT 0,
    online_attendance INTEGER DEFAULT 0,
    children_attendance INTEGER DEFAULT 0,
    volunteer_attendance INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(church_id, date, event_type, location_id)
);

CREATE INDEX idx_attendance_analytics_church_date ON attendance_analytics(church_id, date);

-- =====================================================
-- GIVING & FINANCE
-- =====================================================

-- Giving Funds
CREATE TABLE giving_funds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    code VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    is_tax_deductible BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    goal_amount DECIMAL(12,2),
    goal_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(church_id, name)
);

CREATE INDEX idx_giving_funds_church ON giving_funds(church_id);
CREATE INDEX idx_giving_funds_active ON giving_funds(church_id, is_active);

-- Donations
CREATE TABLE donations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    person_id UUID REFERENCES people(id) ON DELETE SET NULL,
    household_id UUID REFERENCES households(id) ON DELETE SET NULL,
    fund_id UUID NOT NULL REFERENCES giving_funds(id),
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'USD',
    donation_date DATE NOT NULL,
    payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'check', 'card', 'ach', 'online', 'mobile', 'crypto', 'other')),
    check_number VARCHAR(50),
    transaction_id VARCHAR(255), -- From payment processor
    stripe_charge_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),
    is_recurring BOOLEAN DEFAULT false,
    recurring_donation_id UUID,
    notes TEXT,
    tax_deductible BOOLEAN DEFAULT true,
    receipt_sent BOOLEAN DEFAULT false,
    receipt_sent_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_donations_church ON donations(church_id);
CREATE INDEX idx_donations_person ON donations(person_id) WHERE person_id IS NOT NULL;
CREATE INDEX idx_donations_household ON donations(household_id) WHERE household_id IS NOT NULL;
CREATE INDEX idx_donations_fund ON donations(fund_id);
CREATE INDEX idx_donations_date ON donations(church_id, donation_date);
CREATE INDEX idx_donations_stripe ON donations(stripe_charge_id) WHERE stripe_charge_id IS NOT NULL;

-- Recurring Donations
CREATE TABLE recurring_donations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    person_id UUID REFERENCES people(id) ON DELETE SET NULL,
    fund_id UUID NOT NULL REFERENCES giving_funds(id),
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'USD',
    frequency VARCHAR(50) NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'annually')),
    start_date DATE NOT NULL,
    end_date DATE,
    next_donation_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    pause_until DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recurring_donations_church ON recurring_donations(church_id);
CREATE INDEX idx_recurring_donations_person ON recurring_donations(person_id);
CREATE INDEX idx_recurring_donations_next_date ON recurring_donations(next_donation_date) WHERE is_active = true;
CREATE INDEX idx_recurring_donations_stripe ON recurring_donations(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- Pledges
CREATE TABLE pledges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    person_id UUID REFERENCES people(id) ON DELETE SET NULL,
    fund_id UUID NOT NULL REFERENCES giving_funds(id),
    total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount > 0),
    amount_given DECIMAL(12,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    frequency VARCHAR(50) CHECK (frequency IN ('one_time', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pledges_church ON pledges(church_id);
CREATE INDEX idx_pledges_person ON pledges(person_id);
CREATE INDEX idx_pledges_fund ON pledges(fund_id);
CREATE INDEX idx_pledges_dates ON pledges(church_id, start_date, end_date);

-- =====================================================
-- COMMUNICATIONS
-- =====================================================

-- Communication Templates
CREATE TABLE communication_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'sms', 'push', 'letter')),
    category VARCHAR(100),
    subject VARCHAR(255),
    content TEXT NOT NULL,
    html_content TEXT,
    variables JSONB DEFAULT '[]', -- Available merge variables
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_communication_templates_church ON communication_templates(church_id);
CREATE INDEX idx_communication_templates_type ON communication_templates(church_id, type);

-- Communication Logs
CREATE TABLE communication_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    template_id UUID REFERENCES communication_templates(id) ON DELETE SET NULL,
    recipient_person_id UUID REFERENCES people(id) ON DELETE SET NULL,
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(50),
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'sms', 'push', 'letter')),
    subject VARCHAR(255),
    content TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked')),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_communication_logs_church ON communication_logs(church_id);
CREATE INDEX idx_communication_logs_person ON communication_logs(recipient_person_id) WHERE recipient_person_id IS NOT NULL;
CREATE INDEX idx_communication_logs_sent ON communication_logs(sent_at);
CREATE INDEX idx_communication_logs_status ON communication_logs(church_id, status);

-- =====================================================
-- AI & ANALYTICS
-- =====================================================

-- AI Sermon Transcriptions
CREATE TABLE sermon_transcriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    speaker VARCHAR(255),
    date DATE NOT NULL,
    audio_url TEXT,
    video_url TEXT,
    transcription TEXT,
    summary TEXT,
    key_points TEXT[],
    bible_references JSONB DEFAULT '[]',
    topics TEXT[],
    sentiment_analysis JSONB,
    engagement_score NUMERIC(3,2),
    ai_embeddings vector(1536),
    duration_seconds INTEGER,
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX idx_sermon_transcriptions_church ON sermon_transcriptions(church_id);
CREATE INDEX idx_sermon_transcriptions_date ON sermon_transcriptions(church_id, date);
CREATE INDEX idx_sermon_transcriptions_topics ON sermon_transcriptions USING GIN(topics);
CREATE INDEX idx_sermon_transcriptions_embeddings ON sermon_transcriptions USING ivfflat (ai_embeddings vector_cosine_ops);

-- AI Member Insights
CREATE TABLE member_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL CHECK (insight_type IN ('engagement', 'spiritual_growth', 'giving', 'attendance', 'volunteer', 'pastoral_care')),
    insight_date DATE NOT NULL,
    score NUMERIC(3,2),
    trend VARCHAR(20) CHECK (trend IN ('increasing', 'stable', 'decreasing')),
    factors JSONB DEFAULT '{}',
    recommendations TEXT[],
    ai_confidence NUMERIC(3,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(person_id, insight_type, insight_date)
);

CREATE INDEX idx_member_insights_person ON member_insights(person_id);
CREATE INDEX idx_member_insights_date ON member_insights(insight_date);
CREATE INDEX idx_member_insights_type ON member_insights(person_id, insight_type);

-- Predictive Analytics
CREATE TABLE predictive_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('churn_risk', 'growth_forecast', 'giving_prediction', 'attendance_forecast')),
    target_date DATE NOT NULL,
    predictions JSONB NOT NULL,
    confidence_scores JSONB,
    model_version VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_predictive_analytics_church ON predictive_analytics(church_id);
CREATE INDEX idx_predictive_analytics_type_date ON predictive_analytics(church_id, model_type, target_date);

-- =====================================================
-- VOLUNTEERS & SCHEDULING
-- =====================================================

-- Volunteer Roles
CREATE TABLE volunteer_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    ministry_area VARCHAR(100),
    required_skills TEXT[],
    background_check_required BOOLEAN DEFAULT false,
    training_required BOOLEAN DEFAULT false,
    min_age INTEGER,
    time_commitment VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_volunteer_roles_church ON volunteer_roles(church_id);
CREATE INDEX idx_volunteer_roles_active ON volunteer_roles(church_id, is_active);

-- Volunteer Assignments
CREATE TABLE volunteer_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES volunteer_roles(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'declined', 'completed', 'no_show')),
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(person_id, role_id, event_id, scheduled_date)
);

CREATE INDEX idx_volunteer_assignments_person ON volunteer_assignments(person_id);
CREATE INDEX idx_volunteer_assignments_role ON volunteer_assignments(role_id);
CREATE INDEX idx_volunteer_assignments_event ON volunteer_assignments(event_id);
CREATE INDEX idx_volunteer_assignments_date ON volunteer_assignments(scheduled_date);

-- =====================================================
-- SECURITY & AUDIT
-- =====================================================

-- User Accounts (Staff/Admin)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    person_id UUID REFERENCES people(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'admin', 'staff', 'volunteer', 'member')),
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMPTZ,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(email)
);

CREATE INDEX idx_users_church ON users(church_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_person ON users(person_id) WHERE person_id IS NOT NULL;

-- Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_church ON audit_logs(church_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to tables with updated_at
CREATE TRIGGER update_churches_updated_at BEFORE UPDATE ON churches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_people_updated_at BEFORE UPDATE ON people
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_households_updated_at BEFORE UPDATE ON households
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_donations_updated_at BEFORE UPDATE ON donations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_recurring_donations_updated_at BEFORE UPDATE ON recurring_donations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to update attendance analytics
CREATE OR REPLACE FUNCTION update_attendance_analytics()
RETURNS TRIGGER AS $$
DECLARE
    v_church_id UUID;
    v_location_id UUID;
    v_event_type VARCHAR(50);
    v_event_date DATE;
    v_membership_status VARCHAR(50);
BEGIN
    -- Get event details
    SELECT e.church_id, e.location_id, e.event_type, DATE(e.start_datetime)
    INTO v_church_id, v_location_id, v_event_type, v_event_date
    FROM events e
    WHERE e.id = NEW.event_id;
    
    -- Get person's membership status
    SELECT membership_status INTO v_membership_status
    FROM people
    WHERE id = NEW.person_id;
    
    -- Update or insert analytics
    INSERT INTO attendance_analytics (
        church_id, location_id, date, event_type,
        total_attendance,
        first_time_visitors,
        returning_visitors,
        members,
        online_attendance
    )
    VALUES (
        v_church_id, v_location_id, v_event_date, v_event_type,
        1,
        CASE WHEN v_membership_status = 'visitor' AND NOT EXISTS(
            SELECT 1 FROM event_attendance ea
            JOIN events e ON ea.event_id = e.id
            WHERE ea.person_id = NEW.person_id
            AND e.church_id = v_church_id
            AND ea.id != NEW.id
        ) THEN 1 ELSE 0 END,
        CASE WHEN v_membership_status = 'visitor' AND EXISTS(
            SELECT 1 FROM event_attendance ea
            JOIN events e ON ea.event_id = e.id
            WHERE ea.person_id = NEW.person_id
            AND e.church_id = v_church_id
            AND ea.id != NEW.id
        ) THEN 1 ELSE 0 END,
        CASE WHEN v_membership_status = 'member' THEN 1 ELSE 0 END,
        CASE WHEN NEW.attendance_type = 'online' THEN 1 ELSE 0 END
    )
    ON CONFLICT (church_id, date, event_type, location_id)
    DO UPDATE SET
        total_attendance = attendance_analytics.total_attendance + EXCLUDED.total_attendance,
        first_time_visitors = attendance_analytics.first_time_visitors + EXCLUDED.first_time_visitors,
        returning_visitors = attendance_analytics.returning_visitors + EXCLUDED.returning_visitors,
        members = attendance_analytics.members + EXCLUDED.members,
        online_attendance = attendance_analytics.online_attendance + EXCLUDED.online_attendance;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_attendance_analytics_trigger
AFTER INSERT ON event_attendance
FOR EACH ROW EXECUTE FUNCTION update_attendance_analytics();

-- Function to update pledge amounts
CREATE OR REPLACE FUNCTION update_pledge_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.person_id IS NOT NULL THEN
        UPDATE pledges
        SET amount_given = amount_given + NEW.amount
        WHERE person_id = NEW.person_id
        AND fund_id = NEW.fund_id
        AND NEW.donation_date BETWEEN start_date AND end_date;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pledge_on_donation
AFTER INSERT ON donations
FOR EACH ROW EXECUTE FUNCTION update_pledge_amount();

-- Row Level Security Policies
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- Create policy for church data isolation
CREATE POLICY church_isolation ON people
    FOR ALL
    USING (church_id = current_setting('app.current_church_id')::UUID);

CREATE POLICY church_isolation ON households
    FOR ALL
    USING (church_id = current_setting('app.current_church_id')::UUID);

CREATE POLICY church_isolation on groups
    FOR ALL
    USING (church_id = current_setting('app.current_church_id')::UUID);

CREATE POLICY church_isolation ON events
    FOR ALL
    USING (church_id = current_setting('app.current_church_id')::UUID);

CREATE POLICY church_isolation ON donations
    FOR ALL
    USING (church_id = current_setting('app.current_church_id')::UUID);

-- =====================================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- =====================================================

-- Member engagement scores
CREATE MATERIALIZED VIEW member_engagement_scores AS
SELECT 
    p.id as person_id,
    p.church_id,
    p.first_name,
    p.last_name,
    COUNT(DISTINCT ea.event_id) as events_attended_30d,
    COUNT(DISTINCT g.id) as active_groups,
    COALESCE(SUM(d.amount), 0) as total_giving_90d,
    MAX(ea.check_in_time) as last_attendance,
    CASE 
        WHEN COUNT(DISTINCT ea.event_id) >= 3 AND COUNT(DISTINCT g.id) >= 1 THEN 'highly_engaged'
        WHEN COUNT(DISTINCT ea.event_id) >= 1 OR COUNT(DISTINCT g.id) >= 1 THEN 'engaged'
        ELSE 'low_engagement'
    END as engagement_level
FROM people p
LEFT JOIN event_attendance ea ON p.id = ea.person_id 
    AND ea.check_in_time >= NOW() - INTERVAL '30 days'
LEFT JOIN group_members gm ON p.id = gm.person_id AND gm.is_active = true
LEFT JOIN groups g ON gm.group_id = g.id AND g.is_active = true
LEFT JOIN donations d ON p.id = d.person_id 
    AND d.donation_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY p.id, p.church_id, p.first_name, p.last_name;

CREATE INDEX idx_member_engagement_scores_church ON member_engagement_scores(church_id);
CREATE INDEX idx_member_engagement_scores_level ON member_engagement_scores(church_id, engagement_level);

-- Refresh materialized views periodically (set up cron job)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY member_engagement_scores;

-- =====================================================
-- SAMPLE INDEXES FOR COMMON QUERIES
-- =====================================================

-- Find members by partial name search
CREATE INDEX idx_people_name_search ON people 
    USING GIN((first_name || ' ' || last_name) gin_trgm_ops);

-- Quick lookup of recent donations
CREATE INDEX idx_donations_recent ON donations(church_id, donation_date DESC)
    WHERE donation_date >= CURRENT_DATE - INTERVAL '1 year';

-- Active recurring donations needing processing
CREATE INDEX idx_recurring_donations_due ON recurring_donations(next_donation_date)
    WHERE is_active = true AND pause_until IS NULL;

-- Upcoming events
CREATE INDEX idx_events_upcoming ON events(church_id, start_datetime)
    WHERE start_datetime >= NOW();

-- Members without recent attendance
CREATE INDEX idx_people_last_attendance ON people(church_id, last_attendance_date)
    WHERE membership_status = 'member';