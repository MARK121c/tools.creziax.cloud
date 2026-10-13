from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, HttpUrl

class RecordingStatus(str, Enum):
    PENDING = "pending"
    INITIALIZING = "initializing"
    JOINING = "joining"
    RECORDING = "recording"
    FINALIZING = "finalizing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class StartRecordingRequest(BaseModel):
    meeting_url: str = Field(..., description="Target meeting link (Google Meet, Teams, Zoom Web, Jitsi, etc.)")
    title: Optional[str] = Field(default=None, description="Descriptive title for the meeting recording")
    bot_name: Optional[str] = Field(default=None, description="Display name for the automated participant bot")
    max_duration_minutes: Optional[int] = Field(default=180, ge=1, le=720, description="Auto-terminate after minutes")
    fps: Optional[int] = Field(default=30, ge=15, le=60, description="Frames per second")
    resolution: Optional[str] = Field(default="1920x1080", description="WidthxHeight e.g. 1920x1080")
    webhook_url: Optional[str] = Field(default=None, description="Optional webhook to ping upon completion or failure")

class StopRecordingRequest(BaseModel):
    recording_id: str = Field(..., description="Unique ID of the recording to terminate")

class RecordingMetadata(BaseModel):
    id: str
    title: str
    meeting_url: str
    bot_name: str
    status: RecordingStatus
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = 0
    file_name: Optional[str] = None
    file_path: Optional[str] = None
    file_size_bytes: Optional[int] = 0
    download_url: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SystemHealthResponse(BaseModel):
    status: str
    uptime_seconds: float
    active_recordings_count: int
    active_recordings: List[str]
    disk_usage_percent: float
    xvfb_running: bool
    pulseaudio_running: bool
    version: str = "1.0.0"

class RecordingListResponse(BaseModel):
    total: int
    items: List[RecordingMetadata]
