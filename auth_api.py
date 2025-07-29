"""
Church Management Platform Authentication API
=============================================
RESTful API endpoints for authentication
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
import re
import logging
from uuid import UUID

from auth_service import (
    AuthenticationService, 
    AuthConfig, 
    DeviceInfo,
    UserRole
)

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/auth", tags=["authentication"])

# Security scheme
security = HTTPBearer()


# ==================== Request/Response Models ====================

class MagicLinkRequest(BaseModel):
    """Request to send magic link"""
    email: EmailStr
    church_id: UUID
    purpose: str = "login"
    metadata: Optional[Dict[str, Any]] = None
    
    @validator('purpose')
    def validate_purpose(cls, v):
        if v not in ['login', 'signup', 'verify_email', 'family_invite']:
            raise ValueError('Invalid purpose')
        return v


class MagicLinkResponse(BaseModel):
    """Response for magic link request"""
    success: bool
    message: str
    email: str


class VerifyTokenRequest(BaseModel):
    """Request to verify magic link token"""
    token: str = Field(..., min_length=20)


class SMSPinRequest(BaseModel):
    """Request to send SMS PIN"""
    phone: str = Field(..., regex=r'^\+?[1-9]\d{1,14}$')
    church_id: UUID


class VerifySMSPinRequest(BaseModel):
    """Request to verify SMS PIN"""
    phone: str = Field(..., regex=r'^\+?[1-9]\d{1,14}$')
    pin: str = Field(..., regex=r'^\d{4,6}$')
    church_id: UUID


class AuthResponse(BaseModel):
    """Standard authentication response"""
    success: bool
    message: str
    user_id: Optional[str] = None
    session_token: Optional[str] = None
    user: Optional[Dict[str, Any]] = None
    requires_onboarding: bool = False
    churches: Optional[List[Dict[str, Any]]] = None


class RecognizeDeviceResponse(BaseModel):
    """Device recognition response"""
    recognized: bool
    confidence_score: float
    suggested_email: Optional[str] = None
    message: Optional[str] = None


class SessionInfo(BaseModel):
    """Session information"""
    user_id: str
    church_id: str
    email: str
    role: str
    permissions: Dict[str, Any]


class ChurchAccessRequest(BaseModel):
    """Request to grant church access"""
    user_id: UUID
    church_id: UUID
    role: str
    permissions: Optional[Dict[str, Any]] = None
    
    @validator('role')
    def validate_role(cls, v):
        valid_roles = [r.value for r in UserRole]
        if v not in valid_roles:
            raise ValueError(f'Invalid role. Must be one of: {valid_roles}')
        return v


class FamilyAccountRequest(BaseModel):
    """Request to create family account"""
    family_name: str = Field(..., min_length=2, max_length=100)
    household_id: Optional[UUID] = None


class AddFamilyMemberRequest(BaseModel):
    """Request to add family member"""
    family_code: str = Field(..., regex=r'^[A-Z]+-\d{4}$')
    user_id: UUID
    relationship: str
    
    @validator('relationship')
    def validate_relationship(cls, v):
        valid = ['parent', 'child', 'spouse', 'guardian', 'other']
        if v not in valid:
            raise ValueError(f'Invalid relationship. Must be one of: {valid}')
        return v


class PrivacyConsentRequest(BaseModel):
    """Privacy consent update request"""
    consent_type: str
    consented: bool
    
    @validator('consent_type')
    def validate_consent_type(cls, v):
        valid = [
            'terms_of_service', 'privacy_policy', 'email_marketing', 
            'sms_marketing', 'directory_listing', 'photo_usage', 
            'data_sharing', 'analytics'
        ]
        if v not in valid:
            raise ValueError(f'Invalid consent type')
        return v


class DirectoryPrivacyRequest(BaseModel):
    """Directory privacy settings"""
    is_listed: bool = True
    show_email: bool = True
    show_phone: bool = False
    show_address: bool = False
    show_birthday: bool = False
    show_family_members: bool = True
    show_groups: bool = True
    visible_to_roles: List[str] = ['member', 'staff', 'admin']
    custom_visibility_rules: Optional[Dict[str, Any]] = None


# ==================== Dependencies ====================

async def get_auth_service(request: Request) -> AuthenticationService:
    """Get authentication service instance"""
    return request.app.state.auth_service


async def get_device_info(request: Request) -> DeviceInfo:
    """Extract device information from request"""
    return DeviceInfo(
        fingerprint=request.headers.get('X-Device-Fingerprint', ''),
        user_agent=request.headers.get('User-Agent', ''),
        ip_address=request.client.host if request.client else '127.0.0.1',
        device_type=request.headers.get('X-Device-Type'),
        browser=request.headers.get('X-Browser'),
        operating_system=request.headers.get('X-OS')
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_service: AuthenticationService = Depends(get_auth_service)
) -> SessionInfo:
    """Get current authenticated user from token"""
    session = await auth_service.validate_session(credentials.credentials)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session"
        )
    
    return SessionInfo(**session)


async def require_role(allowed_roles: List[str]):
    """Require specific roles for access"""
    async def role_checker(current_user: SessionInfo = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker


# ==================== Authentication Endpoints ====================

@router.post("/magic-link", response_model=MagicLinkResponse)
async def send_magic_link(
    request: MagicLinkRequest,
    device_info: DeviceInfo = Depends(get_device_info),
    auth_service: AuthenticationService = Depends(get_auth_service)
):
    """
    Send magic link for passwordless authentication
    
    This endpoint sends a secure sign-in link to the user's email.
    The link expires after 15 minutes for security.
    """
    success, message = await auth_service.send_magic_link(
        email=request.email,
        church_id=str(request.church_id),
        purpose=request.purpose,
        device_info=device_info,
        metadata=request.metadata
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return MagicLinkResponse(
        success=True,
        message=message,
        email=request.email
    )


@router.post("/verify-token", response_model=AuthResponse)
async def verify_magic_link(
    request: VerifyTokenRequest,
    response: Response,
    device_info: DeviceInfo = Depends(get_device_info),
    auth_service: AuthenticationService = Depends(get_auth_service)
):
    """
    Verify magic link token and create session
    """
    result = await auth_service.verify_magic_link(
        token=request.token,
        device_info=device_info
    )
    
    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.message
        )
    
    # Set secure cookie for session
    response.set_cookie(
        key="session_token",
        value=result.session_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=90 * 24 * 60 * 60  # 90 days
    )
    
    # Get user details
    session = await auth_service.validate_session(result.session_token)
    
    # Check if user needs onboarding
    user_details = await auth_service.db.fetchrow("""
        SELECT u.*, p.first_name, p.last_name, p.photo_url
        FROM church_platform.users u
        LEFT JOIN church_platform.people p ON u.person_id = p.id
        WHERE u.id = $1
    """, UUID(result.user_id))
    
    # Get user's churches
    churches = await auth_service.db.fetch("""
        SELECT c.id, c.name, c.subdomain, uca.role, uca.is_primary_church
        FROM church_platform.user_church_access uca
        JOIN church_platform.churches c ON uca.church_id = c.id
        WHERE uca.user_id = $1 AND c.status = 'active'
        ORDER BY uca.is_primary_church DESC, c.name
    """, UUID(result.user_id))
    
    return AuthResponse(
        success=True,
        message=result.message,
        user_id=result.user_id,
        session_token=result.session_token,
        user={
            'email': session['email'],
            'role': session['role'],
            'first_name': user_details.get('first_name'),
            'last_name': user_details.get('last_name'),
            'photo_url': user_details.get('photo_url')
        },
        requires_onboarding=not user_details.get('onboarding_completed', False),
        churches=[dict(c) for c in churches]
    )


@router.post("/sms-pin", response_model=dict)
async def send_sms_pin(
    request: SMSPinRequest,
    device_info: DeviceInfo = Depends(get_device_info),
    auth_service: AuthenticationService = Depends(get_auth_service)
):
    """
    Send SMS PIN for phone-based authentication
    """
    success, message = await auth_service.send_sms_pin(
        phone=request.phone,
        church_id=str(request.church_id),
        device_info=device_info
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return {
        "success": True,
        "message": message,
        "phone_masked": request.phone[-4:]  # Only show last 4 digits
    }


@router.post("/verify-sms", response_model=AuthResponse)
async def verify_sms_pin(
    request: VerifySMSPinRequest,
    response: Response,
    device_info: DeviceInfo = Depends(get_device_info),
    auth_service: AuthenticationService = Depends(get_auth_service)
):
    """
    Verify SMS PIN and create session
    """
    result = await auth_service.verify_sms_pin(
        phone=request.phone,
        pin=request.pin,
        church_id=str(request.church_id),
        device_info=device_info
    )
    
    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.message
        )
    
    # Set secure cookie
    response.set_cookie(
        key="session_token",
        value=result.session_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=90 * 24 * 60 * 60
    )
    
    return AuthResponse(
        success=True,
        message=result.message,
        user_id=result.user_id,
        session_token=result.session_token
    )


@router.post("/recognize-device", response_model=RecognizeDeviceResponse)
async def recognize_device(
    church_id: UUID,
    device_info: DeviceInfo = Depends(get_device_info),
    auth_service: AuthenticationService = Depends(get_auth_service)
):
    """
    Attempt to recognize returning user by device
    """
    if not device_info.fingerprint:
        return RecognizeDeviceResponse(
            recognized=False,
            confidence_score=0.0
        )
    
    result = await auth_service.recognize_user(
        device_info=device_info,
        church_id=str(church_id)
    )
    
    return RecognizeDeviceResponse(
        recognized=result.confidence_score >= 0.85,
        confidence_score=result.confidence_score,
        suggested_email=result.suggested_email,
        message=result.message
    )


@router.post("/logout")
async def logout(
    response: Response,
    current_user: SessionInfo = Depends(get_current_user),
    device_info: DeviceInfo = Depends(get_device_info),
    auth_service: AuthenticationService = Depends(get_auth_service)
):
    """
    Logout user and invalidate session
    """
    # Get session token from auth header
    from fastapi import Header
    auth_header = Header(None, alias="Authorization")
    
    if auth_header and auth_header.startswith("Bearer "):
        session_token = auth_header[7:]
        await auth_service.logout(session_token, device_info)
    
    # Clear cookie
    response.delete_cookie("session_token")
    
    return {"success": True, "message": "You have been signed out"}


@router.get("/session", response_model=SessionInfo)
async def get_session(
    current_user: SessionInfo = Depends(get_current_user)
):
    """
    Get current session information
    """
    return current_user


# ==================== Multi-Church Management ====================

@router.post("/churches/grant-access")
async def grant_church_access(
    request: ChurchAccessRequest,
    current_user: SessionInfo = Depends(require_role(['admin', 'super_admin'])),
    auth_service: AuthenticationService = Depends(get_auth_service)
):
    """
    Grant user access to a church (admin only)
    """
    success = await auth_service.grant_church_access(
        user_id=str(request.user_id),
        church_id=str(request.church_id),
        role=UserRole(request.role),
        permissions=request.permissions,
        invited_by=current_user.user_id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to grant church access"
        )
    
    return {"success": True, "message": "Church access granted successfully"}


@router.post("/churches/switch/{church_id}")
async def switch_church(
    church_id: UUID,
    response: Response,
    current_user: SessionInfo = Depends(get_current_user),
    device_info: DeviceInfo = Depends(get_device_info),
    auth_service: AuthenticationService = Depends(get_auth_service)
):
    """
    Switch to a different church context
    """
    from fastapi import Header
    auth_header = Header(None, alias="Authorization")
    session_token = auth_header[7:] if auth_header and auth_header.startswith("Bearer ") else None
    
    new_token = await auth_service.switch_church(
        user_id=current_user.user_id,
        from_church_id=current_user.church_id,
        to_church_id=str(church_id),
        session_token=session_token,
        device_info=device_info
    )
    
    if not new_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this church"
        )
    
    # Update cookie
    response.set_cookie(
        key="session_token",
        value=new_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=90 * 24 * 60 * 60
    )
    
    return {
        "success": True,
        "message": "Switched church successfully",
        "session_token": new_token
    }


# ==================== Family Account Management ====================

@router.post("/family/create", response_model=dict)
async def create_family_account(
    request: FamilyAccountRequest,
    current_user: SessionInfo = Depends(get_current_user),
    auth_service: AuthenticationService = Depends(get_auth_service)
):
    """
    Create a family account for linked members
    """
    family_code = await auth_service.create_family_account(
        church_id=current_user.church_id,
        primary_user_id=current_user.user_id,
        family_name=request.family_name,
        household_id=str(request.household_id) if request.household_id else None
    )
    
    if not family_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create family account"
        )
    
    return {
        "success": True,
        "family_code": family_code,
        "message": f"Family account created! Share code {family_code} with family members"
    }


@router.post("/family/add-member")
async def add_family_member(
    request: AddFamilyMemberRequest,
    current_user: SessionInfo = Depends(get_current_user),
    auth_service: AuthenticationService = Depends(get_auth_service)
):
    """
    Add member to family account
    """
    success = await auth_service.add_family_member(
        family_code=request.family_code,
        user_id=str(request.user_id),
        relationship=request.relationship,
        added_by=current_user.user_id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to add family member. Check the family code and permissions."
        )
    
    return {"success": True, "message": "Family member added successfully"}


# ==================== Privacy Management ====================

@router.post("/privacy/consent")
async def update_privacy_consent(
    request: PrivacyConsentRequest,
    current_user: SessionInfo = Depends(get_current_user),
    device_info: DeviceInfo = Depends(get_device_info),
    auth_service: AuthenticationService = Depends(get_auth_service)
):
    """
    Update privacy consent preferences
    """
    success = await auth_service.update_privacy_consent(
        user_id=current_user.user_id,
        church_id=current_user.church_id,
        consent_type=request.consent_type,
        consented=request.consented,
        ip_address=device_info.ip_address,
        user_agent=device_info.user_agent
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update consent"
        )
    
    return {"success": True, "message": "Privacy preference updated"}


@router.post("/privacy/directory")
async def update_directory_privacy(
    request: DirectoryPrivacyRequest,
    current_user: SessionInfo = Depends(get_current_user),
    auth_service: AuthenticationService = Depends(get_auth_service)
):
    """
    Update member directory privacy settings
    """
    # Get person_id for current user
    person = await auth_service.db.fetchrow("""
        SELECT person_id FROM church_platform.users WHERE id = $1
    """, UUID(current_user.user_id))
    
    if not person or not person['person_id']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User profile not found"
        )
    
    success = await auth_service.update_directory_privacy(
        person_id=str(person['person_id']),
        church_id=current_user.church_id,
        settings=request.dict()
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update directory privacy"
        )
    
    return {"success": True, "message": "Directory privacy settings updated"}


@router.get("/privacy/directory")
async def get_directory_privacy(
    current_user: SessionInfo = Depends(get_current_user),
    auth_service: AuthenticationService = Depends(get_auth_service)
):
    """
    Get current directory privacy settings
    """
    # Get person_id for current user
    person = await auth_service.db.fetchrow("""
        SELECT person_id FROM church_platform.users WHERE id = $1
    """, UUID(current_user.user_id))
    
    if not person or not person['person_id']:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    
    settings = await auth_service.db.fetchrow("""
        SELECT * FROM church_platform.directory_privacy
        WHERE person_id = $1 AND church_id = $2
    """, person['person_id'], UUID(current_user.church_id))
    
    if not settings:
        # Return defaults
        return {
            "is_listed": True,
            "show_email": True,
            "show_phone": False,
            "show_address": False,
            "show_birthday": False,
            "show_family_members": True,
            "show_groups": True,
            "visible_to_roles": ["member", "staff", "admin"]
        }
    
    return dict(settings)


# ==================== Admin Endpoints ====================

@router.get("/admin/sessions/{user_id}")
async def get_user_sessions(
    user_id: UUID,
    current_user: SessionInfo = Depends(require_role(['admin', 'super_admin'])),
    auth_service: AuthenticationService = Depends(get_auth_service)
):
    """
    Get active sessions for a user (admin only)
    """
    sessions = await auth_service.db.fetch("""
        SELECT s.*, td.device_name, td.device_type, td.browser, td.operating_system
        FROM church_platform.user_sessions s
        LEFT JOIN church_platform.trusted_devices td ON s.device_id = td.id
        WHERE s.user_id = $1 AND s.is_active = true
        AND s.church_id = $2
        ORDER BY s.last_activity_at DESC
    """, user_id, UUID(current_user.church_id))
    
    return {"sessions": [dict(s) for s in sessions]}


@router.post("/admin/sessions/{session_id}/revoke")
async def revoke_session(
    session_id: UUID,
    current_user: SessionInfo = Depends(require_role(['admin', 'super_admin'])),
    auth_service: AuthenticationService = Depends(get_auth_service)
):
    """
    Revoke a specific session (admin only)
    """
    result = await auth_service.db.execute("""
        UPDATE church_platform.user_sessions
        SET is_active = false
        WHERE id = $1 AND church_id = $2
    """, session_id, UUID(current_user.church_id))
    
    return {"success": True, "message": "Session revoked"}


@router.get("/admin/audit-log")
async def get_audit_log(
    user_id: Optional[UUID] = None,
    event_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    current_user: SessionInfo = Depends(require_role(['admin', 'super_admin'])),
    auth_service: AuthenticationService = Depends(get_auth_service)
):
    """
    Get authentication audit log (admin only)
    """
    query = """
        SELECT al.*, u.email
        FROM church_platform.auth_audit_log al
        LEFT JOIN church_platform.users u ON al.user_id = u.id
        WHERE al.church_id = $1
    """
    params = [UUID(current_user.church_id)]
    
    if user_id:
        query += f" AND al.user_id = ${len(params) + 1}"
        params.append(user_id)
    
    if event_type:
        query += f" AND al.event_type = ${len(params) + 1}"
        params.append(event_type)
    
    query += " ORDER BY al.created_at DESC LIMIT $2 OFFSET $3"
    params.extend([limit, offset])
    
    logs = await auth_service.db.fetch(query, *params)
    
    return {
        "logs": [dict(log) for log in logs],
        "total": len(logs),
        "limit": limit,
        "offset": offset
    }


# ==================== Health Check ====================

@router.get("/health")
async def health_check():
    """
    Check authentication service health
    """
    return {
        "status": "healthy",
        "service": "authentication",
        "timestamp": datetime.utcnow().isoformat()
    }