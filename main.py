"""
Church Management Platform - Main Application
=============================================
FastAPI application with complete authentication system
"""

from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import asyncpg
import logging
import os
from typing import Dict, Any
import asyncio

# Import authentication components
from auth_api import router as auth_router
from auth_service import AuthenticationService, AuthConfig
from auth_middleware import (
    SecurityMiddleware,
    RateLimitMiddleware,
    ChurchContextMiddleware,
    AuditLoggingMiddleware
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('church_auth.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


# Database connection manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle - database connections, cleanup, etc."""
    
    # Startup
    logger.info("Starting Church Management Platform...")
    
    # Initialize database connection pool
    database_url = os.getenv(
        "DATABASE_URL", 
        "postgresql://user:password@localhost:5432/church_db"
    )
    
    try:
        app.state.db_pool = await asyncpg.create_pool(
            database_url,
            min_size=5,
            max_size=20,
            command_timeout=30
        )
        logger.info("Database connection pool created")
        
        # Initialize services
        email_service = MockEmailService()  # Replace with real service
        sms_service = MockSMSService()      # Replace with real service
        
        # Configure authentication
        auth_config = AuthConfig(
            magic_link_expiry_minutes=15,
            sms_pin_expiry_minutes=5,
            session_expiry_days=90,
            device_trust_days=90,
            elderly_mode_enabled=True,
            auto_recognize_threshold=0.98,
            suggest_recognize_threshold=0.85,
            rate_limit_max_attempts=5,
            rate_limit_window_minutes=15
        )
        
        # Create authentication service
        app.state.auth_service = AuthenticationService(
            db_connection=app.state.db_pool,
            email_service=email_service,
            sms_service=sms_service,
            config=auth_config
        )
        
        # Setup periodic cleanup task
        cleanup_task = asyncio.create_task(periodic_cleanup(app.state.auth_service))
        app.state.cleanup_task = cleanup_task
        
        logger.info("Authentication services initialized")
        
    except Exception as e:
        logger.error(f"Failed to initialize application: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down Church Management Platform...")
    
    # Cancel cleanup task
    if hasattr(app.state, 'cleanup_task'):
        app.state.cleanup_task.cancel()
        try:
            await app.state.cleanup_task
        except asyncio.CancelledError:
            pass
    
    # Close database connections
    if hasattr(app.state, 'db_pool'):
        await app.state.db_pool.close()
        logger.info("Database connections closed")


# Create FastAPI application
app = FastAPI(
    title="Church Management Platform API",
    description="AI-first church management with elderly-friendly authentication",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)

# Add security middleware (order matters!)
app.add_middleware(
    SecurityMiddleware,
    enable_csrf=True,
    enable_cors=True,
    allowed_origins=[
        "https://app.fruittree.church",
        "https://*.fruittree.church",
        "http://localhost:3000",  # For development
        "http://localhost:8080"   # For development
    ],
    enable_rate_limiting=True,
    enable_security_headers=True
)

app.add_middleware(
    RateLimitMiddleware,
    calls_per_minute=60,
    calls_per_hour=1000,
    enable_church_limits=True
)

app.add_middleware(
    ChurchContextMiddleware
)

app.add_middleware(
    AuditLoggingMiddleware,
    log_requests=True,
    log_responses=False,
    sensitive_paths=[
        "/api/auth/magic-link",
        "/api/auth/sms-pin",
        "/api/donations"
    ]
)

# Add CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://app.fruittree.church",
        "https://*.fruittree.church",
        "http://localhost:3000",
        "http://localhost:8080"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=[
        "Content-Type",
        "Authorization", 
        "X-CSRF-Token",
        "X-Church-ID",
        "X-Device-Fingerprint",
        "X-Device-Type",
        "X-Browser",
        "X-OS"
    ]
)

# Include routers
app.include_router(auth_router)

# Error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unexpected errors"""
    logger.error(
        f"Unhandled exception: {str(exc)}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "client": request.client.host if request.client else None
        },
        exc_info=True
    )
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected error occurred. Please try again.",
            "error_id": getattr(request.state, 'request_id', 'unknown')
        }
    )


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Church Management Platform API",
        "version": "1.0.0",
        "documentation": "/api/docs",
        "status": "running"
    }


# Health check endpoint
@app.get("/health")
async def health_check():
    """Comprehensive health check"""
    health_status = {
        "status": "healthy",
        "timestamp": "2025-07-29T12:00:00Z",
        "services": {}
    }
    
    # Check database connection
    try:
        async with app.state.db_pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        health_status["services"]["database"] = "healthy"
    except Exception as e:
        health_status["services"]["database"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    # Check authentication service
    try:
        # Simple check that service is initialized
        if hasattr(app.state, 'auth_service'):
            health_status["services"]["authentication"] = "healthy"
        else:
            health_status["services"]["authentication"] = "not initialized"
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["services"]["authentication"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    return health_status


# Church subdomain resolution endpoint
@app.get("/api/churches/resolve/{subdomain}")
async def resolve_church_subdomain(subdomain: str):
    """Resolve church by subdomain"""
    async with app.state.db_pool.acquire() as conn:
        church = await conn.fetchrow("""
            SELECT id, name, subdomain, status, plan_type, settings
            FROM church_platform.churches 
            WHERE subdomain = $1 AND status = 'active'
        """, subdomain)
        
        if not church:
            return JSONResponse(
                status_code=404,
                content={"detail": "Church not found"}
            )
        
        return {
            "id": str(church['id']),
            "name": church['name'],
            "subdomain": church['subdomain'],
            "plan_type": church['plan_type'],
            "settings": church['settings']
        }


# Development endpoints (remove in production)
if os.getenv("ENVIRONMENT") == "development":
    
    @app.get("/api/dev/create-test-church")
    async def create_test_church():
        """Create test church for development"""
        async with app.state.db_pool.acquire() as conn:
            church_id = await conn.fetchval("""
                INSERT INTO church_platform.churches 
                (name, subdomain, status, plan_type)
                VALUES ('Test Church', 'test', 'active', 'starter')
                ON CONFLICT (subdomain) DO UPDATE 
                SET name = EXCLUDED.name
                RETURNING id
            """)
            
            return {
                "church_id": str(church_id),
                "subdomain": "test",
                "message": "Test church created/updated"
            }
    
    @app.get("/api/dev/cleanup-tokens")
    async def cleanup_expired_tokens():
        """Manually trigger token cleanup"""
        await app.state.auth_service.db.execute("""
            SELECT church_platform.cleanup_expired_auth_tokens()
        """)
        return {"message": "Expired tokens cleaned up"}


# Background tasks
async def periodic_cleanup(auth_service: AuthenticationService):
    """Periodic cleanup of expired tokens and sessions"""
    while True:
        try:
            # Run cleanup every 15 minutes
            await asyncio.sleep(900)
            
            # Clean up expired tokens
            await auth_service.db.execute("""
                SELECT church_platform.cleanup_expired_auth_tokens()
            """)
            
            logger.info("Periodic cleanup completed")
            
        except asyncio.CancelledError:
            logger.info("Cleanup task cancelled")
            break
        except Exception as e:
            logger.error(f"Error in periodic cleanup: {e}")


# Mock services for development
class MockEmailService:
    """Mock email service for development"""
    
    async def send(self, to: str, subject: str, html: str, text: str = None):
        """Mock send email"""
        logger.info(f"Mock email sent to {to}: {subject}")
        # In development, log the magic link for easy testing
        if "sign-in link" in html.lower():
            import re
            link_match = re.search(r'href="([^"]+verify[^"]+)"', html)
            if link_match:
                logger.info(f"Magic link: {link_match.group(1)}")
        return True


class MockSMSService:
    """Mock SMS service for development"""
    
    async def send(self, phone: str, message: str):
        """Mock send SMS"""
        logger.info(f"Mock SMS sent to {phone}: {message}")
        # Log the PIN for easy testing
        import re
        pin_match = re.search(r'code is: (\d+)', message)
        if pin_match:
            logger.info(f"SMS PIN: {pin_match.group(1)}")
        return True


if __name__ == "__main__":
    import uvicorn
    
    # Run the application
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info",
        reload_dirs=["./"]
    )