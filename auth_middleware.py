"""
Church Management Platform Security Middleware
==============================================
Security middleware for request processing and protection
"""

from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import ASGIApp
import time
import logging
import json
import hashlib
import hmac
from typing import Optional, Dict, Any, List, Callable
from datetime import datetime, timezone
from uuid import UUID
import re
from functools import wraps

logger = logging.getLogger(__name__)


class SecurityHeaders:
    """Security headers for responses"""
    
    @staticmethod
    def get_default_headers() -> Dict[str, str]:
        """Get default security headers"""
        return {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "geolocation=(), camera=(), microphone=()",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Content-Security-Policy": (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://js.stripe.com; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: https: blob:; "
                "connect-src 'self' https://api.stripe.com wss://; "
                "frame-src 'self' https://js.stripe.com; "
                "object-src 'none'; "
                "base-uri 'self'; "
                "form-action 'self'; "
                "frame-ancestors 'none';"
            )
        }


class SecurityMiddleware(BaseHTTPMiddleware):
    """
    Main security middleware for the application
    """
    
    def __init__(
        self,
        app: ASGIApp,
        enable_csrf: bool = True,
        enable_cors: bool = True,
        allowed_origins: List[str] = None,
        enable_rate_limiting: bool = True,
        enable_security_headers: bool = True
    ):
        super().__init__(app)
        self.enable_csrf = enable_csrf
        self.enable_cors = enable_cors
        self.allowed_origins = allowed_origins or ["https://app.fruittree.church"]
        self.enable_rate_limiting = enable_rate_limiting
        self.enable_security_headers = enable_security_headers
    
    async def dispatch(
        self, 
        request: Request, 
        call_next: RequestResponseEndpoint
    ) -> Response:
        """Process request through security checks"""
        
        # Track request timing
        start_time = time.time()
        
        # Add request ID for tracing
        request_id = self._generate_request_id()
        request.state.request_id = request_id
        
        try:
            # Security checks
            if self.enable_csrf:
                await self._check_csrf(request)
            
            # Add security context
            await self._add_security_context(request)
            
            # Process request
            response = await call_next(request)
            
            # Add security headers
            if self.enable_security_headers:
                self._add_security_headers(response)
            
            # Add CORS headers if enabled
            if self.enable_cors:
                self._add_cors_headers(request, response)
            
            # Add request tracking headers
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Response-Time"] = f"{(time.time() - start_time) * 1000:.2f}ms"
            
            return response
            
        except HTTPException as e:
            # Log security exceptions
            logger.warning(
                f"Security exception: {e.detail}",
                extra={
                    "request_id": request_id,
                    "path": request.url.path,
                    "method": request.method,
                    "client": request.client.host if request.client else None
                }
            )
            raise
        except Exception as e:
            # Log unexpected errors
            logger.error(
                f"Unexpected error in security middleware: {str(e)}",
                extra={
                    "request_id": request_id,
                    "path": request.url.path,
                    "method": request.method
                },
                exc_info=True
            )
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal server error"},
                headers={"X-Request-ID": request_id}
            )
    
    async def _check_csrf(self, request: Request) -> None:
        """Check CSRF token for state-changing requests"""
        # Skip CSRF check for safe methods
        if request.method in ["GET", "HEAD", "OPTIONS"]:
            return
        
        # Skip for API endpoints with Bearer auth
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            return
        
        # Check CSRF token
        csrf_token_header = request.headers.get("X-CSRF-Token")
        csrf_token_cookie = request.cookies.get("csrf_token")
        
        if not csrf_token_header or not csrf_token_cookie:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token missing"
            )
        
        if not self._verify_csrf_token(csrf_token_header, csrf_token_cookie):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid CSRF token"
            )
    
    async def _add_security_context(self, request: Request) -> None:
        """Add security context to request"""
        # Extract church context from subdomain or header
        host = request.headers.get("Host", "")
        subdomain_match = re.match(r"^([a-z0-9-]+)\.fruittree\.church", host)
        
        if subdomain_match:
            church_subdomain = subdomain_match.group(1)
            # Look up church by subdomain
            if hasattr(request.app.state, 'db'):
                church = await request.app.state.db.fetchrow("""
                    SELECT id, name, status FROM church_platform.churches
                    WHERE subdomain = $1 AND status = 'active'
                """, church_subdomain)
                
                if church:
                    request.state.church_id = str(church['id'])
                    request.state.church_name = church['name']
        
        # Also check header (for API clients)
        church_id_header = request.headers.get("X-Church-ID")
        if church_id_header and not hasattr(request.state, 'church_id'):
            request.state.church_id = church_id_header
    
    def _add_security_headers(self, response: Response) -> None:
        """Add security headers to response"""
        headers = SecurityHeaders.get_default_headers()
        for key, value in headers.items():
            response.headers[key] = value
    
    def _add_cors_headers(self, request: Request, response: Response) -> None:
        """Add CORS headers to response"""
        origin = request.headers.get("Origin")
        
        if origin in self.allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = (
                "Content-Type, Authorization, X-CSRF-Token, X-Church-ID, "
                "X-Device-Fingerprint, X-Device-Type, X-Browser, X-OS"
            )
            response.headers["Access-Control-Max-Age"] = "86400"
    
    def _generate_request_id(self) -> str:
        """Generate unique request ID"""
        return hashlib.sha256(
            f"{time.time()}{hash(id(self))}".encode()
        ).hexdigest()[:16]
    
    def _verify_csrf_token(self, token_header: str, token_cookie: str) -> bool:
        """Verify CSRF token"""
        # In production, use proper CSRF token verification
        # This is a simplified version
        return token_header == token_cookie


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware for API protection
    """
    
    def __init__(
        self,
        app: ASGIApp,
        calls_per_minute: int = 60,
        calls_per_hour: int = 1000,
        enable_church_limits: bool = True
    ):
        super().__init__(app)
        self.calls_per_minute = calls_per_minute
        self.calls_per_hour = calls_per_hour
        self.enable_church_limits = enable_church_limits
    
    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint
    ) -> Response:
        """Check rate limits before processing request"""
        
        # Skip rate limiting for health checks
        if request.url.path == "/api/auth/health":
            return await call_next(request)
        
        # Get identifier for rate limiting
        identifier = self._get_identifier(request)
        
        # Check rate limits
        if hasattr(request.app.state, 'auth_service'):
            auth_service = request.app.state.auth_service
            
            # Check minute limit
            if not await auth_service._check_rate_limit(
                identifier, "ip", "api_minute"
            ):
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Please slow down."},
                    headers={"Retry-After": "60"}
                )
            
            # Check hour limit for authenticated users
            if hasattr(request.state, 'user_id'):
                if not await auth_service._check_rate_limit(
                    str(request.state.user_id), "user", "api_hour"
                ):
                    return JSONResponse(
                        status_code=429,
                        content={"detail": "Hourly request limit exceeded."},
                        headers={"Retry-After": "3600"}
                    )
        
        return await call_next(request)
    
    def _get_identifier(self, request: Request) -> str:
        """Get identifier for rate limiting"""
        # Use authenticated user ID if available
        if hasattr(request.state, 'user_id'):
            return str(request.state.user_id)
        
        # Otherwise use IP address
        if request.client:
            return request.client.host
        
        # Fallback to forwarded IP
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        return "unknown"


class ChurchContextMiddleware(BaseHTTPMiddleware):
    """
    Middleware to enforce church context isolation
    """
    
    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint
    ) -> Response:
        """Enforce church context for database queries"""
        
        # Skip for public endpoints
        public_paths = ["/api/auth/health", "/api/auth/magic-link", "/api/auth/verify-token"]
        if request.url.path in public_paths:
            return await call_next(request)
        
        # Set church context for RLS
        if hasattr(request.state, 'church_id') and hasattr(request.app.state, 'db'):
            db = request.app.state.db
            
            # Set church context for this request
            await db.execute("""
                SET LOCAL app.current_church_id = $1
            """, request.state.church_id)
            
            # Set user context if authenticated
            if hasattr(request.state, 'user_id'):
                await db.execute("""
                    SET LOCAL app.current_user_id = $1
                """, request.state.user_id)
                
                # Set user role
                if hasattr(request.state, 'user_role'):
                    await db.execute("""
                        SET LOCAL app.current_user_role = $1
                    """, request.state.user_role)
        
        return await call_next(request)


class AuditLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for comprehensive audit logging
    """
    
    def __init__(
        self,
        app: ASGIApp,
        log_requests: bool = True,
        log_responses: bool = False,
        sensitive_paths: List[str] = None
    ):
        super().__init__(app)
        self.log_requests = log_requests
        self.log_responses = log_responses
        self.sensitive_paths = sensitive_paths or [
            "/api/auth/magic-link",
            "/api/auth/sms-pin",
            "/api/donations"
        ]
    
    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint
    ) -> Response:
        """Log requests and responses for audit trail"""
        
        # Skip logging for health checks
        if request.url.path == "/api/auth/health":
            return await call_next(request)
        
        # Prepare audit log entry
        audit_entry = {
            "request_id": getattr(request.state, 'request_id', None),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "method": request.method,
            "path": request.url.path,
            "query_params": dict(request.query_params),
            "client_ip": request.client.host if request.client else None,
            "user_id": getattr(request.state, 'user_id', None),
            "church_id": getattr(request.state, 'church_id', None)
        }
        
        # Log request body for non-sensitive paths
        if self.log_requests and request.url.path not in self.sensitive_paths:
            if request.method in ["POST", "PUT", "PATCH"]:
                try:
                    body = await request.body()
                    request._body = body  # Cache for later use
                    audit_entry["request_body"] = json.loads(body) if body else None
                except:
                    pass
        
        # Process request
        start_time = time.time()
        response = await call_next(request)
        duration = time.time() - start_time
        
        # Add response info
        audit_entry["response_status"] = response.status_code
        audit_entry["duration_ms"] = round(duration * 1000, 2)
        
        # Log to audit system
        if hasattr(request.app.state, 'db') and response.status_code >= 400:
            await self._log_to_database(request.app.state.db, audit_entry)
        
        # Also log to standard logger
        logger.info(
            f"{request.method} {request.url.path} - {response.status_code} - {duration:.3f}s",
            extra=audit_entry
        )
        
        return response
    
    async def _log_to_database(self, db, audit_entry: Dict[str, Any]) -> None:
        """Log audit entry to database"""
        try:
            await db.execute("""
                INSERT INTO church_platform.audit_logs
                (church_id, user_id, action, entity_type, entity_id, 
                 new_values, ip_address, user_agent)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """, 
                UUID(audit_entry['church_id']) if audit_entry['church_id'] else None,
                UUID(audit_entry['user_id']) if audit_entry['user_id'] else None,
                f"{audit_entry['method']} {audit_entry['path']}",
                "api_request",
                audit_entry['request_id'],
                json.dumps(audit_entry),
                audit_entry['client_ip'],
                audit_entry.get('user_agent')
            )
        except Exception as e:
            logger.error(f"Failed to log audit entry: {e}")


def require_church_context(func: Callable) -> Callable:
    """
    Decorator to ensure church context is set
    """
    @wraps(func)
    async def wrapper(request: Request, *args, **kwargs):
        if not hasattr(request.state, 'church_id'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Church context required"
            )
        return await func(request, *args, **kwargs)
    return wrapper


def require_permissions(*permissions: str):
    """
    Decorator to check user permissions
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            if not hasattr(request.state, 'user_permissions'):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Authentication required"
                )
            
            user_permissions = request.state.user_permissions or {}
            for permission in permissions:
                if not user_permissions.get(permission, False):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Missing required permission: {permission}"
                    )
            
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator


def sanitize_input(data: Dict[str, Any], allowed_fields: List[str]) -> Dict[str, Any]:
    """
    Sanitize input data to prevent injection attacks
    """
    sanitized = {}
    for field in allowed_fields:
        if field in data:
            value = data[field]
            # Basic sanitization - extend as needed
            if isinstance(value, str):
                # Remove null bytes
                value = value.replace('\x00', '')
                # Limit length
                value = value[:1000]
            sanitized[field] = value
    return sanitized