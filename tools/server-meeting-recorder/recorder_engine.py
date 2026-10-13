import os
import signal
import time
import subprocess
import shutil
from pathlib import Path
from typing import Optional
from config import settings
from logger import logger

class FFmpegRecorderEngine:
    """
    Supervises high-performance headless screen & audio recording via FFmpeg.
    Captures X11 frame-buffer and PulseAudio virtual loopback stream.
    """

    def __init__(self, recording_id: str, output_file: Path, fps: int = 30, resolution: str = "1920x1080"):
        self.recording_id = recording_id
        self.output_file = output_file
        self.fps = fps
        self.resolution = resolution
        self.process: Optional[subprocess.Popen] = None
        self.started_at: Optional[float] = None
        self.ended_at: Optional[float] = None

    def start(self):
        """Builds FFmpeg pipeline and launches background process."""
        self.output_file.parent.mkdir(parents=True, exist_ok=True)

        display_input = f"{settings.XVFB_DISPLAY}.0"
        pulse_source = f"{settings.PULSE_SINK_NAME}.monitor"

        ffmpeg_bin = shutil.which("ffmpeg") or "ffmpeg"

        # Production-grade FFmpeg flags
        cmd = [
            ffmpeg_bin,
            "-y",                                   # Overwrite if exists
            "-nostdin",                             # Disable stdin in daemon mode
            "-f", "x11grab",                        # X11 screen grabber
            "-draw_mouse", "1",                     # Capture cursor
            "-framerate", str(self.fps),
            "-video_size", self.resolution,
            "-i", display_input,                    # Input 0: Virtual Screen
            "-f", "pulse",                          # PulseAudio input
            "-i", pulse_source,                     # Input 1: Virtual Sink Monitor
            "-c:v", settings.VIDEO_CODEC,           # H.264
            "-preset", settings.VIDEO_PRESET,       # CPU/Speed balance
            "-crf", str(settings.VIDEO_CRF),        # High quality
            "-pix_fmt", "yuv420p",                  # Universal MP4 compatibility
            "-c:a", settings.AUDIO_CODEC,           # AAC
            "-b:a", settings.AUDIO_BITRATE,         # 192kbps
            "-ar", "48000",
            "-movflags", "+faststart",              # Move moov atom to start for web streaming
            str(self.output_file)
        ]

        logger.info(f"[{self.recording_id}] Spawning FFmpeg recorder...")
        env = os.environ.copy()
        env["DISPLAY"] = settings.XVFB_DISPLAY

        log_path = settings.LOG_DIR / f"ffmpeg_{self.recording_id}.log"
        self.log_file = open(log_path, "w")

        try:
            self.process = subprocess.Popen(
                cmd,
                env=env,
                stdout=self.log_file,
                stderr=subprocess.STDOUT,
                preexec_fn=os.setsid
            )
            self.started_at = time.time()
            logger.info(f"[{self.recording_id}] FFmpeg recording active (PID: {self.process.pid}).")
        except Exception as e:
            logger.error(f"[{self.recording_id}] Failed launching FFmpeg: {e}")
            if self.log_file:
                self.log_file.close()
            raise

    def is_running(self) -> bool:
        """Returns True if the FFmpeg process is still actively recording."""
        if not self.process:
            return False
        return self.process.poll() is None

    def stop(self, timeout_sec: int = 15) -> bool:
        """
        Gracefully terminates FFmpeg with SIGINT to properly finalize MP4 headers (moov atom).
        """
        if not self.is_running():
            logger.warning(f"[{self.recording_id}] Recorder process not running or already stopped.")
            self.ended_at = time.time()
            if hasattr(self, "log_file") and self.log_file and not self.log_file.closed:
                self.log_file.close()
            return True

        logger.info(f"[{self.recording_id}] Sending SIGINT to FFmpeg process group to finalize file...")
        try:
            os.killpg(os.getpgid(self.process.pid), signal.SIGINT)
        except ProcessLookupError:
            pass

        # Wait for clean exit
        start_wait = time.time()
        while time.time() - start_wait < timeout_sec:
            if self.process.poll() is not None:
                break
            time.sleep(0.5)

        # Force terminate if still alive
        if self.process.poll() is None:
            logger.warning(f"[{self.recording_id}] FFmpeg did not exit within timeout, terminating forcibly...")
            try:
                os.killpg(os.getpgid(self.process.pid), signal.SIGTERM)
                time.sleep(1.0)
                if self.process.poll() is None:
                    os.killpg(os.getpgid(self.process.pid), signal.SIGKILL)
            except Exception as e:
                logger.error(f"[{self.recording_id}] Force kill error: {e}")

        self.ended_at = time.time()
        if hasattr(self, "log_file") and self.log_file and not self.log_file.closed:
            self.log_file.close()

        logger.info(f"[{self.recording_id}] FFmpeg recording finalized. Output: {self.output_file}")
        return True

    def get_duration(self) -> int:
        """Calculates total recorded duration in seconds."""
        if not self.started_at:
            return 0
        end = self.ended_at or time.time()
        return int(end - self.started_at)
