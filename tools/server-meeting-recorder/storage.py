import os
import json
import shutil
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timedelta
import psutil
from config import settings
from models import RecordingMetadata, RecordingStatus
from logger import logger

class StorageManager:
    """
    Manages persistence of video artifacts, metadata JSON records,
    and automated disk retention / cleanup policies.
    """

    def __init__(self):
        self.recordings_dir = settings.RECORDINGS_DIR
        self.recordings_dir.mkdir(parents=True, exist_ok=True)

    def _meta_path(self, recording_id: str) -> Path:
        return self.recordings_dir / f"{recording_id}.json"

    def _video_path(self, recording_id: str) -> Path:
        return self.recordings_dir / f"{recording_id}.mp4"

    def save_metadata(self, meta: RecordingMetadata):
        """Saves metadata record to JSON file."""
        path = self._meta_path(meta.id)
        with open(path, "w", encoding="utf-8") as f:
            f.write(meta.model_dump_json(indent=2))

    def get_metadata(self, recording_id: str) -> Optional[RecordingMetadata]:
        """Loads metadata record for a given recording ID."""
        path = self._meta_path(recording_id)
        if not path.exists():
            return None
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return RecordingMetadata(**data)
        except Exception as e:
            logger.error(f"Error loading metadata for {recording_id}: {e}")
            return None

    def list_recordings(self) -> List[RecordingMetadata]:
        """Lists all recordings sorted by creation time descending."""
        records = []
        for file in self.recordings_dir.glob("*.json"):
            try:
                with open(file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    records.append(RecordingMetadata(**data))
            except Exception:
                continue
        records.sort(key=lambda r: r.created_at, reverse=True)
        return records

    def delete_recording(self, recording_id: str) -> bool:
        """Deletes both video and metadata files."""
        meta_path = self._meta_path(recording_id)
        video_path = self._video_path(recording_id)

        deleted = False
        if video_path.exists():
            try:
                video_path.unlink()
                deleted = True
            except Exception as e:
                logger.error(f"Error deleting video {video_path}: {e}")

        if meta_path.exists():
            try:
                meta_path.unlink()
                deleted = True
            except Exception as e:
                logger.error(f"Error deleting metadata {meta_path}: {e}")

        return deleted

    def get_disk_usage_percent(self) -> float:
        """Returns disk usage percentage of the recordings storage drive."""
        try:
            usage = psutil.disk_usage(str(self.recordings_dir))
            return usage.percent
        except Exception:
            return 0.0

    def cleanup_old_recordings(self):
        """
        Automated cleanup routine:
        1. Deletes files older than RETENTION_DAYS.
        2. If disk usage exceeds MAX_DISK_USAGE_PERCENT, deletes oldest recordings until safe.
        """
        logger.info("Executing periodic storage retention check...")
        cutoff_date = datetime.utcnow() - timedelta(days=settings.RETENTION_DAYS)
        records = self.list_recordings()

        for rec in records:
            if rec.created_at < cutoff_date:
                logger.info(f"Purging expired recording: {rec.id} ({rec.created_at})")
                self.delete_recording(rec.id)

        # Check threshold
        usage = self.get_disk_usage_percent()
        if usage > settings.MAX_DISK_USAGE_PERCENT:
            logger.warning(f"Disk usage ({usage}%) exceeds threshold ({settings.MAX_DISK_USAGE_PERCENT}%). Purging oldest...")
            # records are sorted newest first, so reverse
            for rec in reversed(records):
                if self.get_disk_usage_percent() <= settings.MAX_DISK_USAGE_PERCENT - 5:
                    break
                logger.info(f"Emergency disk clearance: removing {rec.id}")
                self.delete_recording(rec.id)

storage_mgr = StorageManager()
