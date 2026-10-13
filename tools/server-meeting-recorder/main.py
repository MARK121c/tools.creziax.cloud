import sys
import signal
import asyncio
import uvicorn
from contextlib import asynccontextmanager
from config import settings
from logger import logger
from api import app
from audio_display_manager import audio_display_mgr
from service import recorder_service
from storage import storage_mgr

async def periodic_cleanup_task():
    """Runs retention cleanup every 6 hours."""
    while True:
        try:
            await asyncio.sleep(6 * 3600)
            storage_mgr.cleanup_old_recordings()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in periodic cleanup task: {e}")

@asynccontextmanager
async def lifespan(app):
    # Startup
    logger.info("==================================================")
    logger.info(f"Starting {settings.APP_NAME}...")
    logger.info(f"Host: {settings.HOST}:{settings.PORT} | Env: {settings.ENVIRONMENT}")
    logger.info("==================================================")

    # Initialize headless environment
    try:
        audio_display_mgr.initialize_environment()
    except Exception as e:
        logger.warning(f"Note on initial audio/display setup: {e}")

    # Initial storage maintenance
    storage_mgr.cleanup_old_recordings()

    # Launch cleanup daemon task
    cleanup_task = asyncio.create_task(periodic_cleanup_task())

    yield

    # Shutdown
    logger.info("Graceful shutdown initiated...")
    cleanup_task.cancel()
    await recorder_service.stop_all()
    audio_display_mgr.cleanup()
    logger.info("Service shutdown complete.")

app.router.lifespan_context = lifespan

def main():
    """Entry point for running the meeting recorder daemon."""
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        log_level="info",
        access_log=True
    )

if __name__ == "__main__":
    main()
