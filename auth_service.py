"""
Church Management Platform Authentication Service
=================================================
Elderly-friendly authentication with enterprise security
"""

import secrets
import hashlib
import re
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Tuple, List
from enum import Enum
import phonenumbers
from email_validator import validate_email, EmailNotValidError
import bcrypt
from uuid import UUID
import logging
import json
from dataclasses import dataclass
from abc import ABC, abstractmethod

# Configure logging
logger = logging.getLogger(__name__)


class AuthMethod(Enum):
    """Supported authentication methods"""
    MAGIC_LINK = "magic_link"
    PASSWORD = "password"
    SMS_PIN = "sms_pin"
    SOCIAL = "social"


class UserRole(Enum):
    """User roles in the system"""
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    STAFF = "staff"
    VOLUNTEER = "volunteer"
    MEMBER = "member"
    VISITOR = "visitor"


@dataclass
class AuthConfig:
    """Authentication configuration"""
    magic_link_expiry_minutes: int = 15
    sms_pin_expiry_minutes: int = 5
    sms_pin_length: int = 6
    session_expiry_days: int = 90
    device_trust_days: int = 90
    max_login_attempts: int = 5
    lockout_duration_minutes: int = 30
    password_min_length: int = 8
    rate_limit_window_minutes: int = 15
    rate_limit_max_attempts: int = 5
    elderly_mode_enabled: bool = True
    auto_recognize_threshold: float = 0.98
    suggest_recognize_threshold: float = 0.85


@dataclass
class DeviceInfo:
    """Device information for trust scoring"""
    fingerprint: str
    user_agent: str
    ip_address: str
    device_type: Optional[str] = None
    browser: Optional[str] = None
    operating_system: Optional[str] = None


@dataclass
class AuthResult:
    """Authentication result"""
    success: bool
    user_id: Optional[str] = None
    session_token: Optional[str] = None
    message: str = ""
    requires_verification: bool = False
    suggested_email: Optional[str] = None
    confidence_score: Optional[float] = None


class AuthenticationService:
    """
    Main authentication service for church management platform
    Prioritizes user experience for elderly users while maintaining security
    """
    
    def __init__(self, db_connection, email_service, sms_service, config: Optional[AuthConfig] = None):
        self.db = db_connection
        self.email_service = email_service
        self.sms_service = sms_service
        self.config = config or AuthConfig()
    
    # ==================== Magic Link Authentication ====================
    
    async def send_magic_link(
        self, 
        email: str, 
        church_id: str,
        purpose: str = "login",
        device_info: Optional[DeviceInfo] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Tuple[bool, str]:
        """
        Send magic link to user email with church-appropriate messaging
        """
        try:
            # Validate email
            valid_email = validate_email(email, check_deliverability=False)
            email = valid_email.normalized
        except EmailNotValidError:
            return False, "Please enter a valid email address"
        
        # Check rate limiting
        if not await self._check_rate_limit(email, "email", "magic_link"):
            return False, "Too many attempts. Please try again in a few minutes."
        
        # Generate secure token
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=self.config.magic_link_expiry_minutes)
        
        # Store magic link
        await self.db.execute("""
            INSERT INTO church_platform.auth_magic_links 
            (user_email, church_id, token, token_hash, purpose, expires_at, ip_address, user_agent, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        """, email, church_id, token, token_hash, purpose, expires_at, 
            device_info.ip_address if device_info else None,
            device_info.user_agent if device_info else None,
            json.dumps(metadata) if metadata else '{}')
        
        # Get church details for personalized email
        church = await self.db.fetchrow("""
            SELECT name, settings->>'welcome_message' as welcome_message
            FROM church_platform.churches WHERE id = $1
        """, church_id)
        
        # Send email with pastoral tone
        subject = f"Sign in to {church['name']}"
        if purpose == "signup":
            subject = f"Welcome to {church['name']}!"
        
        # Create user-friendly message
        message = self._create_magic_link_email(
            church_name=church['name'],
            token=token,
            purpose=purpose,
            expires_minutes=self.config.magic_link_expiry_minutes,
            custom_message=church.get('welcome_message')
        )
        
        await self.email_service.send(
            to=email,
            subject=subject,
            html=message,
            text=self._strip_html(message)
        )
        
        # Log the event
        await self._log_auth_event(
            event_type="magic_link_sent",
            church_id=church_id,
            event_details={"email": email, "purpose": purpose},
            device_info=device_info
        )
        
        return True, "Check your email! We sent you a secure sign-in link."
    
    async def verify_magic_link(
        self,
        token: str,
        device_info: Optional[DeviceInfo] = None
    ) -> AuthResult:
        """
        Verify magic link token and create session
        """
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        
        # Find and validate token
        link = await self.db.fetchrow("""
            SELECT ml.*, u.id as user_id, u.role, u.is_active
            FROM church_platform.auth_magic_links ml
            LEFT JOIN church_platform.users u ON ml.user_email = u.email AND ml.church_id = u.church_id
            WHERE ml.token_hash = $1 
            AND ml.used_at IS NULL 
            AND ml.expires_at > NOW()
        """, token_hash)
        
        if not link:
            return AuthResult(
                success=False,
                message="This sign-in link has expired or already been used. Please request a new one."
            )
        
        # Mark token as used
        await self.db.execute("""
            UPDATE church_platform.auth_magic_links 
            SET used_at = NOW(), ip_address = $1, user_agent = $2
            WHERE token_hash = $3
        """, device_info.ip_address if device_info else None,
            device_info.user_agent if device_info else None,
            token_hash)
        
        # Handle new user signup
        if not link['user_id'] and link['purpose'] == 'signup':
            user_id = await self._create_user(
                email=link['user_email'],
                church_id=link['church_id'],
                metadata=json.loads(link['metadata'] or '{}')
            )
        else:
            user_id = link['user_id']
        
        if not user_id:
            return AuthResult(
                success=False,
                message="Unable to complete sign-in. Please contact your church administrator."
            )
        
        # Check if user is active
        user = await self.db.fetchrow("""
            SELECT is_active, locked_until FROM church_platform.users WHERE id = $1
        """, user_id)
        
        if not user['is_active']:
            return AuthResult(
                success=False,
                message="Your account is not active. Please contact your church administrator."
            )
        
        if user['locked_until'] and user['locked_until'] > datetime.now(timezone.utc):
            return AuthResult(
                success=False,
                message="Your account is temporarily locked. Please try again later."
            )
        
        # Create session
        session_token = await self._create_session(
            user_id=user_id,
            church_id=link['church_id'],
            login_method="magic_link",
            device_info=device_info
        )
        
        # Trust device if elderly mode enabled
        if self.config.elderly_mode_enabled and device_info:
            await self._trust_device(user_id, device_info)
        
        # Log successful login
        await self._log_auth_event(
            event_type="login_success",
            user_id=user_id,
            church_id=link['church_id'],
            event_details={"method": "magic_link"},
            device_info=device_info
        )
        
        return AuthResult(
            success=True,
            user_id=str(user_id),
            session_token=session_token,
            message="Welcome! You're now signed in."
        )
    
    # ==================== SMS PIN Authentication ====================
    
    async def send_sms_pin(
        self,
        phone: str,
        church_id: str,
        device_info: Optional[DeviceInfo] = None
    ) -> Tuple[bool, str]:
        """
        Send SMS PIN for phone-only users
        """
        # Validate and format phone number
        try:
            parsed_phone = phonenumbers.parse(phone, "US")
            if not phonenumbers.is_valid_number(parsed_phone):
                return False, "Please enter a valid phone number"
            phone = phonenumbers.format_number(parsed_phone, phonenumbers.PhoneNumberFormat.E164)
        except:
            return False, "Please enter a valid phone number"
        
        # Check rate limiting
        if not await self._check_rate_limit(phone, "phone", "sms_pin"):
            return False, "Too many attempts. Please try again in a few minutes."
        
        # Generate PIN
        pin = ''.join(secrets.choice('0123456789') for _ in range(self.config.sms_pin_length))
        pin_hash = hashlib.sha256(pin.encode()).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=self.config.sms_pin_expiry_minutes)
        
        # Store PIN
        await self.db.execute("""
            INSERT INTO church_platform.auth_sms_pins
            (phone, church_id, pin_hash, expires_at, ip_address)
            VALUES ($1, $2, $3, $4, $5)
        """, phone, church_id, pin_hash, expires_at,
            device_info.ip_address if device_info else None)
        
        # Get church name
        church = await self.db.fetchrow("""
            SELECT name FROM church_platform.churches WHERE id = $1
        """, church_id)
        
        # Send SMS
        message = f"Your {church['name']} sign-in code is: {pin}\n\nThis code expires in {self.config.sms_pin_expiry_minutes} minutes."
        await self.sms_service.send(phone, message)
        
        # Log event
        await self._log_auth_event(
            event_type="sms_pin_sent",
            church_id=church_id,
            event_details={"phone": phone[-4:]},  # Only log last 4 digits
            device_info=device_info
        )
        
        return True, f"We sent a {self.config.sms_pin_length}-digit code to your phone"
    
    async def verify_sms_pin(
        self,
        phone: str,
        pin: str,
        church_id: str,
        device_info: Optional[DeviceInfo] = None
    ) -> AuthResult:
        """
        Verify SMS PIN and create session
        """
        # Format phone number
        try:
            parsed_phone = phonenumbers.parse(phone, "US")
            phone = phonenumbers.format_number(parsed_phone, phonenumbers.PhoneNumberFormat.E164)
        except:
            return AuthResult(success=False, message="Invalid phone number")
        
        pin_hash = hashlib.sha256(pin.encode()).hexdigest()
        
        # Find and validate PIN
        sms_pin = await self.db.fetchrow("""
            SELECT * FROM church_platform.auth_sms_pins
            WHERE phone = $1 AND church_id = $2 AND pin_hash = $3
            AND used_at IS NULL AND expires_at > NOW()
            ORDER BY created_at DESC LIMIT 1
        """, phone, church_id, pin_hash)
        
        if not sms_pin:
            # Increment attempts on most recent PIN
            await self.db.execute("""
                UPDATE church_platform.auth_sms_pins
                SET attempts = attempts + 1
                WHERE phone = $1 AND church_id = $2 AND used_at IS NULL
                AND id = (
                    SELECT id FROM church_platform.auth_sms_pins
                    WHERE phone = $1 AND church_id = $2 AND used_at IS NULL
                    ORDER BY created_at DESC LIMIT 1
                )
            """, phone, church_id)
            
            return AuthResult(
                success=False,
                message="Incorrect code. Please try again."
            )
        
        # Mark PIN as used
        await self.db.execute("""
            UPDATE church_platform.auth_sms_pins SET used_at = NOW() WHERE id = $1
        """, sms_pin['id'])
        
        # Find or create user
        user = await self.db.fetchrow("""
            SELECT u.id, u.is_active, u.locked_until
            FROM church_platform.users u
            WHERE u.phone = $1 AND u.church_id = $2
        """, phone, church_id)
        
        if not user:
            # Create new user with phone
            user_id = await self._create_user(
                phone=phone,
                church_id=church_id,
                preferred_auth_method="sms_pin"
            )
        else:
            user_id = user['id']
            
            # Check if active
            if not user['is_active']:
                return AuthResult(
                    success=False,
                    message="Your account is not active. Please contact your church."
                )
        
        # Create session
        session_token = await self._create_session(
            user_id=user_id,
            church_id=church_id,
            login_method="sms_pin",
            device_info=device_info
        )
        
        # Log successful login
        await self._log_auth_event(
            event_type="sms_pin_verified",
            user_id=user_id,
            church_id=church_id,
            device_info=device_info
        )
        
        return AuthResult(
            success=True,
            user_id=str(user_id),
            session_token=session_token,
            message="Welcome! You're now signed in."
        )
    
    # ==================== Device Recognition ====================
    
    async def recognize_user(
        self,
        device_info: DeviceInfo,
        church_id: str
    ) -> AuthResult:
        """
        Attempt to recognize returning user by device
        """
        # Find trusted device
        device = await self.db.fetchrow("""
            SELECT td.*, u.email, u.first_name
            FROM church_platform.trusted_devices td
            JOIN church_platform.users u ON td.user_id = u.id
            WHERE td.device_fingerprint = $1
            AND td.is_trusted = true
            AND td.trusted_until > NOW()
            AND u.church_id = $2
            AND u.is_active = true
            ORDER BY td.trust_score DESC
            LIMIT 1
        """, device_info.fingerprint, church_id)
        
        if not device:
            return AuthResult(
                success=False,
                message="",
                confidence_score=0.0
            )
        
        # Update device last seen
        await self.db.execute("""
            UPDATE church_platform.trusted_devices
            SET last_seen_at = NOW(), last_ip_address = $1
            WHERE id = $2
        """, device_info.ip_address, device['id'])
        
        # Calculate confidence score
        trust_score = await self._calculate_device_trust_score(device['id'])
        
        # Auto-fill email if high confidence
        if trust_score >= self.config.auto_recognize_threshold:
            return AuthResult(
                success=False,  # Still need authentication
                suggested_email=device['email'],
                confidence_score=trust_score,
                message=f"Welcome back{' ' + device['first_name'] if device['first_name'] else ''}!"
            )
        elif trust_score >= self.config.suggest_recognize_threshold:
            return AuthResult(
                success=False,
                suggested_email=device['email'],
                confidence_score=trust_score,
                message="Is this you?"
            )
        
        return AuthResult(
            success=False,
            confidence_score=trust_score
        )
    
    # ==================== Session Management ====================
    
    async def validate_session(
        self,
        session_token: str,
        church_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Validate session token and return user info
        """
        session = await self.db.fetchrow("""
            SELECT s.*, u.email, u.role, u.permissions,
                   uca.role as church_role, uca.permissions as church_permissions
            FROM church_platform.user_sessions s
            JOIN church_platform.users u ON s.user_id = u.id
            LEFT JOIN church_platform.user_church_access uca ON 
                s.user_id = uca.user_id AND s.church_id = uca.church_id
            WHERE s.session_token = $1
            AND s.is_active = true
            AND s.expires_at > NOW()
            AND ($2::uuid IS NULL OR s.church_id = $2)
        """, session_token, church_id)
        
        if not session:
            return None
        
        # Update last activity
        await self.db.execute("""
            UPDATE church_platform.user_sessions
            SET last_activity_at = NOW()
            WHERE id = $1
        """, session['id'])
        
        # Combine permissions
        permissions = {
            **json.loads(session['permissions'] or '{}'),
            **json.loads(session['church_permissions'] or '{}')
        }
        
        return {
            'user_id': str(session['user_id']),
            'church_id': str(session['church_id']),
            'email': session['email'],
            'role': session['church_role'] or session['role'],
            'permissions': permissions,
            'session_id': str(session['id'])
        }
    
    async def logout(
        self,
        session_token: str,
        device_info: Optional[DeviceInfo] = None
    ) -> bool:
        """
        Logout user and invalidate session
        """
        session = await self.db.fetchrow("""
            UPDATE church_platform.user_sessions
            SET is_active = false
            WHERE session_token = $1 AND is_active = true
            RETURNING user_id, church_id
        """, session_token)
        
        if session:
            await self._log_auth_event(
                event_type="logout",
                user_id=session['user_id'],
                church_id=session['church_id'],
                device_info=device_info
            )
            return True
        
        return False
    
    # ==================== Multi-Church Access ====================
    
    async def grant_church_access(
        self,
        user_id: str,
        church_id: str,
        role: UserRole,
        permissions: Optional[Dict[str, Any]] = None,
        invited_by: Optional[str] = None
    ) -> bool:
        """
        Grant user access to a church
        """
        try:
            await self.db.execute("""
                INSERT INTO church_platform.user_church_access
                (user_id, church_id, role, permissions, invited_by, invited_at)
                VALUES ($1, $2, $3, $4, $5, NOW())
                ON CONFLICT (user_id, church_id) 
                DO UPDATE SET 
                    role = EXCLUDED.role,
                    permissions = EXCLUDED.permissions,
                    updated_at = NOW()
            """, UUID(user_id), UUID(church_id), role.value,
                json.dumps(permissions or {}), UUID(invited_by) if invited_by else None)
            
            await self._log_auth_event(
                event_type="church_access_granted",
                user_id=UUID(user_id),
                church_id=UUID(church_id),
                event_details={
                    "role": role.value,
                    "invited_by": invited_by
                }
            )
            
            return True
        except Exception as e:
            logger.error(f"Failed to grant church access: {e}")
            return False
    
    async def switch_church(
        self,
        user_id: str,
        from_church_id: str,
        to_church_id: str,
        session_token: str,
        device_info: Optional[DeviceInfo] = None
    ) -> Optional[str]:
        """
        Switch user's active church context
        """
        # Verify user has access to target church
        access = await self.db.fetchrow("""
            SELECT role, permissions FROM church_platform.user_church_access
            WHERE user_id = $1 AND church_id = $2
        """, UUID(user_id), UUID(to_church_id))
        
        if not access:
            return None
        
        # Create new session for target church
        new_session_token = await self._create_session(
            user_id=UUID(user_id),
            church_id=UUID(to_church_id),
            login_method="church_switch",
            device_info=device_info
        )
        
        # Invalidate old session
        await self.db.execute("""
            UPDATE church_platform.user_sessions
            SET is_active = false
            WHERE session_token = $1
        """, session_token)
        
        # Update last accessed
        await self.db.execute("""
            UPDATE church_platform.user_church_access
            SET last_accessed_at = NOW()
            WHERE user_id = $1 AND church_id = $2
        """, UUID(user_id), UUID(to_church_id))
        
        return new_session_token
    
    # ==================== Family Account Management ====================
    
    async def create_family_account(
        self,
        church_id: str,
        primary_user_id: str,
        family_name: str,
        household_id: Optional[str] = None
    ) -> Optional[str]:
        """
        Create a family account for linked authentication
        """
        # Generate unique family code
        family_code = await self._generate_family_code()
        
        try:
            result = await self.db.fetchrow("""
                INSERT INTO church_platform.family_accounts
                (church_id, primary_user_id, family_name, family_code, household_id)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            """, UUID(church_id), UUID(primary_user_id), family_name, 
                family_code, UUID(household_id) if household_id else None)
            
            # Add primary user as family member
            await self.db.execute("""
                INSERT INTO church_platform.family_members
                (family_account_id, user_id, relationship, can_manage_family)
                VALUES ($1, $2, 'parent', true)
            """, result['id'], UUID(primary_user_id))
            
            await self._log_auth_event(
                event_type="family_account_created",
                user_id=UUID(primary_user_id),
                church_id=UUID(church_id),
                event_details={"family_code": family_code}
            )
            
            return family_code
        except Exception as e:
            logger.error(f"Failed to create family account: {e}")
            return None
    
    async def add_family_member(
        self,
        family_code: str,
        user_id: str,
        relationship: str,
        added_by: str
    ) -> bool:
        """
        Add member to family account
        """
        # Find family account
        family = await self.db.fetchrow("""
            SELECT fa.*, fm.can_manage_family
            FROM church_platform.family_accounts fa
            JOIN church_platform.family_members fm ON fa.id = fm.family_account_id
            WHERE fa.family_code = $1 AND fm.user_id = $2
        """, family_code, UUID(added_by))
        
        if not family or not family['can_manage_family']:
            return False
        
        try:
            await self.db.execute("""
                INSERT INTO church_platform.family_members
                (family_account_id, user_id, relationship, parental_approval_required)
                VALUES ($1, $2, $3, $4)
            """, family['id'], UUID(user_id), relationship,
                relationship == 'child')
            
            await self._log_auth_event(
                event_type="family_member_added",
                user_id=UUID(user_id),
                church_id=family['church_id'],
                event_details={
                    "family_id": str(family['id']),
                    "added_by": added_by,
                    "relationship": relationship
                }
            )
            
            return True
        except Exception as e:
            logger.error(f"Failed to add family member: {e}")
            return False
    
    # ==================== Privacy Management ====================
    
    async def update_privacy_consent(
        self,
        user_id: str,
        church_id: str,
        consent_type: str,
        consented: bool,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> bool:
        """
        Record privacy consent decision
        """
        try:
            await self.db.execute("""
                INSERT INTO church_platform.privacy_consents
                (user_id, church_id, consent_type, consented, ip_address, user_agent)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (user_id, church_id, consent_type)
                DO UPDATE SET 
                    consented = EXCLUDED.consented,
                    ip_address = EXCLUDED.ip_address,
                    user_agent = EXCLUDED.user_agent,
                    created_at = NOW()
            """, UUID(user_id), UUID(church_id), consent_type, consented,
                ip_address, user_agent)
            
            return True
        except Exception as e:
            logger.error(f"Failed to update privacy consent: {e}")
            return False
    
    async def update_directory_privacy(
        self,
        person_id: str,
        church_id: str,
        settings: Dict[str, Any]
    ) -> bool:
        """
        Update member directory privacy settings
        """
        try:
            await self.db.execute("""
                INSERT INTO church_platform.directory_privacy
                (person_id, church_id, is_listed, show_email, show_phone, 
                 show_address, show_birthday, show_family_members, show_groups,
                 visible_to_roles, custom_visibility_rules)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (person_id, church_id)
                DO UPDATE SET
                    is_listed = EXCLUDED.is_listed,
                    show_email = EXCLUDED.show_email,
                    show_phone = EXCLUDED.show_phone,
                    show_address = EXCLUDED.show_address,
                    show_birthday = EXCLUDED.show_birthday,
                    show_family_members = EXCLUDED.show_family_members,
                    show_groups = EXCLUDED.show_groups,
                    visible_to_roles = EXCLUDED.visible_to_roles,
                    custom_visibility_rules = EXCLUDED.custom_visibility_rules,
                    updated_at = NOW()
            """, UUID(person_id), UUID(church_id),
                settings.get('is_listed', True),
                settings.get('show_email', True),
                settings.get('show_phone', False),
                settings.get('show_address', False),
                settings.get('show_birthday', False),
                settings.get('show_family_members', True),
                settings.get('show_groups', True),
                settings.get('visible_to_roles', ['member', 'staff', 'admin']),
                json.dumps(settings.get('custom_visibility_rules', {})))
            
            return True
        except Exception as e:
            logger.error(f"Failed to update directory privacy: {e}")
            return False
    
    # ==================== Helper Methods ====================
    
    async def _create_user(
        self,
        church_id: str,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        preferred_auth_method: str = "magic_link",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[UUID]:
        """
        Create new user account
        """
        try:
            # Generate temporary password (user won't use it)
            temp_password = secrets.token_urlsafe(32)
            password_hash = bcrypt.hashpw(temp_password.encode(), bcrypt.gensalt()).decode()
            
            result = await self.db.fetchrow("""
                INSERT INTO church_platform.users
                (church_id, email, phone, password_hash, role, preferred_auth_method,
                 email_verified, phone_verified)
                VALUES ($1, $2, $3, $4, 'member', $5, $6, $7)
                RETURNING id
            """, UUID(church_id), email, phone, password_hash,
                preferred_auth_method,
                email is not None,  # Auto-verify if using magic link
                phone is not None)  # Auto-verify if using SMS
            
            user_id = result['id']
            
            # Create church access record
            await self.db.execute("""
                INSERT INTO church_platform.user_church_access
                (user_id, church_id, role, is_primary_church, accepted_at)
                VALUES ($1, $2, 'member', true, NOW())
            """, user_id, UUID(church_id))
            
            # Link to person record if possible
            if email:
                person = await self.db.fetchrow("""
                    SELECT id FROM church_platform.people
                    WHERE church_id = $1 AND email = $2
                """, UUID(church_id), email)
                
                if person:
                    await self.db.execute("""
                        UPDATE church_platform.users 
                        SET person_id = $1 WHERE id = $2
                    """, person['id'], user_id)
            
            return user_id
        except Exception as e:
            logger.error(f"Failed to create user: {e}")
            return None
    
    async def _create_session(
        self,
        user_id: UUID,
        church_id: UUID,
        login_method: str,
        device_info: Optional[DeviceInfo] = None
    ) -> str:
        """
        Create new user session
        """
        session_token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(days=self.config.session_expiry_days)
        
        # Find or create device record
        device_id = None
        if device_info:
            device = await self.db.fetchrow("""
                INSERT INTO church_platform.trusted_devices
                (user_id, device_fingerprint, device_type, browser, 
                 operating_system, last_ip_address)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (user_id, device_fingerprint)
                DO UPDATE SET
                    last_seen_at = NOW(),
                    last_ip_address = EXCLUDED.last_ip_address
                RETURNING id
            """, user_id, device_info.fingerprint, device_info.device_type,
                device_info.browser, device_info.operating_system,
                device_info.ip_address)
            device_id = device['id']
        
        # Create session
        await self.db.execute("""
            INSERT INTO church_platform.user_sessions
            (user_id, church_id, session_token, device_id, ip_address,
             user_agent, expires_at, login_method)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        """, user_id, church_id, session_token, device_id,
            device_info.ip_address if device_info else None,
            device_info.user_agent if device_info else None,
            expires_at, login_method)
        
        return session_token
    
    async def _trust_device(
        self,
        user_id: UUID,
        device_info: DeviceInfo,
        days: Optional[int] = None
    ) -> None:
        """
        Mark device as trusted
        """
        trust_days = days or self.config.device_trust_days
        trusted_until = datetime.now(timezone.utc) + timedelta(days=trust_days)
        
        await self.db.execute("""
            UPDATE church_platform.trusted_devices
            SET is_trusted = true,
                trusted_at = NOW(),
                trusted_until = $1,
                trust_score = GREATEST(trust_score, 0.8)
            WHERE user_id = $2 AND device_fingerprint = $3
        """, trusted_until, user_id, device_info.fingerprint)
        
        await self._log_auth_event(
            event_type="device_trusted",
            user_id=user_id,
            event_details={"days": trust_days},
            device_info=device_info
        )
    
    async def _calculate_device_trust_score(self, device_id: UUID) -> float:
        """
        Calculate device trust score
        """
        result = await self.db.fetchval("""
            SELECT church_platform.calculate_device_trust_score($1)
        """, device_id)
        return float(result) if result else 0.5
    
    async def _check_rate_limit(
        self,
        identifier: str,
        identifier_type: str,
        action: str
    ) -> bool:
        """
        Check if action is rate limited
        """
        result = await self.db.fetchval("""
            SELECT church_platform.check_rate_limit($1, $2, $3, $4, $5)
        """, identifier, identifier_type, action,
            self.config.rate_limit_max_attempts,
            self.config.rate_limit_window_minutes)
        return bool(result)
    
    async def _log_auth_event(
        self,
        event_type: str,
        user_id: Optional[UUID] = None,
        church_id: Optional[UUID] = None,
        event_details: Optional[Dict[str, Any]] = None,
        device_info: Optional[DeviceInfo] = None,
        risk_score: Optional[float] = None
    ) -> None:
        """
        Log authentication event for audit
        """
        await self.db.execute("""
            INSERT INTO church_platform.auth_audit_log
            (user_id, church_id, event_type, event_details, ip_address,
             user_agent, device_fingerprint, risk_score)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        """, user_id, church_id, event_type,
            json.dumps(event_details or {}),
            device_info.ip_address if device_info else None,
            device_info.user_agent if device_info else None,
            device_info.fingerprint if device_info else None,
            risk_score)
    
    async def _generate_family_code(self) -> str:
        """
        Generate unique family code
        """
        while True:
            # Generate readable code (e.g., "FAITH-1234")
            prefix = secrets.choice(['FAITH', 'HOPE', 'LOVE', 'GRACE', 'PEACE'])
            numbers = ''.join(secrets.choice('0123456789') for _ in range(4))
            code = f"{prefix}-{numbers}"
            
            # Check uniqueness
            exists = await self.db.fetchval("""
                SELECT EXISTS(
                    SELECT 1 FROM church_platform.family_accounts 
                    WHERE family_code = $1
                )
            """, code)
            
            if not exists:
                return code
    
    def _create_magic_link_email(
        self,
        church_name: str,
        token: str,
        purpose: str,
        expires_minutes: int,
        custom_message: Optional[str] = None
    ) -> str:
        """
        Create friendly email template for magic link
        """
        base_url = "https://app.fruittree.church"  # Configure from environment
        link = f"{base_url}/auth/verify?token={token}"
        
        if purpose == "signup":
            greeting = "Welcome to our church family!"
            action = "Complete your registration"
        else:
            greeting = "Welcome back!"
            action = "Sign in to your account"
        
        message = custom_message or f"We're glad you're here."
        
        return f"""
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2c3e50; text-align: center;">{church_name}</h2>
            <h3 style="color: #34495e; text-align: center;">{greeting}</h3>
            <p style="font-size: 16px; line-height: 1.6; color: #555;">
                {message}
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{link}" style="background-color: #3498db; color: white; 
                   padding: 15px 30px; text-decoration: none; border-radius: 5px; 
                   font-size: 18px; display: inline-block;">
                    {action}
                </a>
            </div>
            <p style="font-size: 14px; color: #777; text-align: center;">
                This link expires in {expires_minutes} minutes for your security.
            </p>
            <p style="font-size: 14px; color: #777; text-align: center;">
                If you didn't request this, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">
                Having trouble? Simply reply to this email and we'll help you sign in.
            </p>
        </div>
        """
    
    def _strip_html(self, html: str) -> str:
        """
        Simple HTML stripper for text version of emails
        """
        import re
        clean = re.compile('<.*?>')
        return re.sub(clean, '', html).strip()