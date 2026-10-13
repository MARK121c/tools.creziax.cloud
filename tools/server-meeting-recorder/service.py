import asyncio
import uuid
import time
import httpx
from datetime import datetime
from typing import Dict, Optional, List
from pathlib import Path
from config import settings
from logger import logger
from models import (
    RecordingStatus,
    StartRecordingRequest,
    RecordingMetadata,
)
from audio_display_manager import audio_display_mgr
from recorder_engine import FFmpegRecorderEngine
from browser_engine import BrowserMeetingBot
from storage import storage_mgr

class ActiveRecordingJob:
    def __init__(
        self,
        metadata: RecordingMetadata,
        recorder: FFmpegRecorderEngine,
        bot: BrowserMeetingBot,
        task: asyncio.Task,
        webhook_url: Optional[str] = None
    ):
        self.metadata = metadata
        self.recorder = recorder
        self.bot = bot
        self.task = task
        self.webhook_url = webhook_url
        self.stop_requested = asyncio.Event()

class MeetingRecorderService:
    """
    Central orchestration service managing asynchronous meeting recording lifecycles.
    """

    def __init__(self):
        self.active_jobs: Dict[str, ActiveRecordingJob] = {}
        self.start_time = time.time()

    async def start_recording(self, req: StartRecordingRequest) -> RecordingMetadata:
        """Initializes and schedules a new meeting recording session."""
        rec_id = f"rec_{uuid.uuid4().hex[:12]}"
        title = req.title or f"Meeting_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        video_filename = f"{rec_id}.mp4"
        video_path = settings.RECORDINGS_DIR / video_filename

        metadata = RecordingMetadata(
            id=rec_id,
            title=title,
            meeting_url=req.meeting_url,
            bot_name=req.bot_name or settings.DEFAULT_BOT_NAME,
            status=RecordingStatus.INITIALIZING,
            file_name=video_filename,
            file_path=str(video_path),
            download_url=f"/api/recordings/{rec_id}/download",
            created_at=datetime.utcnow()
        )
        storage_mgr.save_metadata(metadata)

        fps = req.fps or settings.DEFAULT_FPS
        resolution = req.resolution or f"{settings.SCREEN_WIDTH}x{settings.SCREEN_HEIGHT}"

        recorder = FFmpegRecorderEngine(rec_id, video_path, fps=fps, resolution=resolution)
        bot = BrowserMeetingBot(rec_id, req.meeting_url, bot_name=metadata.bot_name)

        # Launch orchestration worker
        task = asyncio.create_task(
            self._recording_lifecycle_worker(rec_id, req, recorder, bot, metadata)
        )

        job = ActiveRecordingJob(
            metadata=metadata,
            recorder=recorder,
            bot=bot,
            task=task,
            webhook_url=req.webhook_url
        )
        self.active_jobs[rec_id] = job

        return metadata

    async def _recording_lifecycle_worker(
        self,
        rec_id: str,
        req: StartRecordingRequest,
        recorder: FFmpegRecorderEngine,
        bot: BrowserMeetingBot,
        metadata: RecordingMetadata
    ):
        job = self.active_jobs.get(rec_id)
        try:
            logger.info(f"[{rec_id}] Step 1: Initializing Virtual Display & Audio stack...")
            audio_display_mgr.initialize_environment()

            logger.info(f"[{rec_id}] Step 2: Starting FFmpeg stream capture...")
            recorder.start()

            logger.info(f"[{rec_id}] Step 3: Launching browser bot to join meeting...")
            metadata.status = RecordingStatus.JOINING
            storage_mgr.save_metadata(metadata)
            await bot.launch_and_join()

            metadata.status = RecordingStatus.RECORDING
            metadata.started_at = datetime.utcnow()
            storage_mgr.save_metadata(metadata)
            logger.info(f"[{rec_id}] Recording active.")

            max_duration = (req.max_duration_minutes or settings.DEFAULT_MAX_DURATION_MINUTES) * 60

            # Wait until stop is explicitly requested or max duration reached
            try:
                await asyncio.wait_for(job.stop_requested.wait(), timeout=max_duration)
                logger.info(f"[{rec_id}] Manual stop signal received.")
            except asyncio.TimeoutError:
                logger.info(f"[{rec_id}] Maximum duration of {req.max_duration_minutes}m reached. Stopping automatically.")

            # Finalization
            await self._finalize_recording(rec_id, RecordingStatus.COMPLETED)

        except Exception as e:
            logger.exception(f"[{rec_id}] Fatal recording failure: {e}")
            metadata.error_message = str(e)
            await self._finalize_recording(rec_id, RecordingStatus.FAILED, error=str(e))

    async def _finalize_recording(self, rec_id: str, final_status: RecordingStatus, error: Optional[str] = None):
        job = self.active_jobs.get(rec_id)
        if not job:
            return

        logger.info(f"[{rec_id}] Finalizing session (status: {final_status})...")
        meta = job.metadata
        meta.status = RecordingStatus.FINALIZING
        storage_mgr.save_metadata(meta)

        # 1. Close browser bot
        try:
            await job.bot.close()
        except Exception as e:
            logger.error(f"[{rec_id}] Error closing browser: {e}")

        # 2. Finalize FFmpeg recording
        try:
            job.recorder.stop()
        except Exception as e:
            logger.error(f"[{rec_id}] Error finalizing FFmpeg: {e}")

        # 3. Update final metadata
        meta.status = final_status
        meta.ended_at = datetime.utcnow()
        meta.duration_seconds = job.recorder.get_duration()
        if error:
            meta.error_message = error

        video_path = Path(meta.file_path)
        if video_path.exists():
            meta.file_size_bytes = video_path.stat().st_size

        storage_mgr.save_metadata(meta)
        logger.info(f"[{rec_id}] Finalization finished. File size: {meta.file_size_bytes} bytes, Duration: {meta.duration_seconds}s")

        # 4. Trigger Webhook if configured
        if job.webhook_url:
            asyncio.create_task(self._send_webhook(job.webhook_url, meta))

        # 5. Remove from active pool
        self.active_jobs.pop(rec_id, None)

    async def _send_webhook(self, url: str, metadata: RecordingMetadata):
        """Sends HTTP POST webhook with recording result."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=metadata.model_dump(mode="json"))
                logger.info(f"[{metadata.id}] Webhook triggered to {url} (status: {res.status_code})")
        except Exception as e:
            logger.warning(f"[{metadata.id}] Webhook dispatch failed: {e}")

    async def stop_recording(self, rec_id: str) -> Optional[RecordingMetadata]:
        """Requests cancellation/completion of an active recording."""
        job = self.active_jobs.get(rec_id)
        if not job:
            meta = storage_mgr.get_metadata(rec_id)
            return meta

        logger.info(f"[{rec_id}] Stop signal triggered.")
        job.stop_requested.set()
        return job.metadata

    async def stop_all(self):
        """Clean shutdown helper for all active jobs."""
        logger.info("Stopping all active recording sessions for server shutdown...")
        for rec_id in list(self.active_jobs.keys()):
            await self.stop_recording(rec_id)

recorder_service = MeetingRecorderService()
