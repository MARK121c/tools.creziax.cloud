import time
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException, Depends, Header, BackgroundTasks, status
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from logger import logger
from models import (
    StartRecordingRequest,
    StopRecordingRequest,
    RecordingMetadata,
    RecordingListResponse,
    SystemHealthResponse
)
from service import recorder_service
from storage import storage_mgr
from audio_display_manager import audio_display_mgr

app = FastAPI(
    title=settings.APP_NAME,
    description="Headless 24/7 Server Meeting Recorder Daemon API for Linux/Docker",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def verify_api_key(x_api_key: Optional[str] = Header(None)):
    """Enforces API Key authentication if API_KEY is set in settings."""
    if settings.API_KEY:
        if not x_api_key or x_api_key != settings.API_KEY:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or missing X-API-Key header"
            )
    return True

@app.get("/health", response_model=SystemHealthResponse, tags=["Health"])
async def get_health():
    """Returns real-time health metrics of the recording daemon, disk, and virtual audio/display."""
    active_ids = list(recorder_service.active_jobs.keys())
    return SystemHealthResponse(
        status="healthy",
        uptime_seconds=time.time() - recorder_service.start_time,
        active_recordings_count=len(active_ids),
        active_recordings=active_ids,
        disk_usage_percent=storage_mgr.get_disk_usage_percent(),
        xvfb_running=audio_display_mgr.is_xvfb_running(),
        pulseaudio_running=audio_display_mgr.is_pulseaudio_running(),
        version="1.0.0"
    )

@app.post("/api/recordings/start", response_model=RecordingMetadata, status_code=status.HTTP_201_CREATED, tags=["Recordings"])
async def start_recording(req: StartRecordingRequest, auth: bool = Depends(verify_api_key)):
    """Starts an automated headless meeting recording session."""
    try:
        metadata = await recorder_service.start_recording(req)
        return metadata
    except Exception as e:
        logger.error(f"Failed to start recording: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/recordings/{recording_id}/stop", response_model=RecordingMetadata, tags=["Recordings"])
async def stop_recording(recording_id: str, auth: bool = Depends(verify_api_key)):
    """Stops an ongoing meeting recording session gracefully and finalizes the MP4."""
    meta = await recorder_service.stop_recording(recording_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Recording not found")
    return meta

@app.get("/api/recordings", response_model=RecordingListResponse, tags=["Recordings"])
async def list_recordings(auth: bool = Depends(verify_api_key)):
    """Lists all past and active recordings with status and metadata."""
    items = storage_mgr.list_recordings()
    return RecordingListResponse(total=len(items), items=items)

@app.get("/api/recordings/{recording_id}", response_model=RecordingMetadata, tags=["Recordings"])
async def get_recording(recording_id: str, auth: bool = Depends(verify_api_key)):
    """Fetches details and status for a specific recording."""
    meta = storage_mgr.get_metadata(recording_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Recording not found")
    return meta

@app.get("/api/recordings/{recording_id}/download", tags=["Recordings"])
async def download_recording(recording_id: str):
    """Streams or downloads the finalized MP4 recording file."""
    meta = storage_mgr.get_metadata(recording_id)
    if not meta or not meta.file_path:
        raise HTTPException(status_code=404, detail="Recording metadata not found")

    file_path = Path(meta.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Video file does not exist or has not finished recording")

    return FileResponse(
        path=str(file_path),
        media_type="video/mp4",
        filename=f"{meta.title or recording_id}.mp4"
    )

@app.delete("/api/recordings/{recording_id}", tags=["Recordings"])
async def delete_recording(recording_id: str, auth: bool = Depends(verify_api_key)):
    """Deletes recording files and metadata from the server."""
    if recording_id in recorder_service.active_jobs:
        await recorder_service.stop_recording(recording_id)

    deleted = storage_mgr.delete_recording(recording_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Recording not found or already deleted")
    return {"status": "success", "message": f"Recording {recording_id} deleted"}
