"""
Muxer Module for Stealth Meeting Recorder Pro
Handles FFmpeg detection, hardware-accelerated video/audio muxing (NVENC/x264 + AAC),
audio-video synchronization, and background file finalization.
"""

import os
import sys
import shutil
import datetime
import subprocess
import threading
from pathlib import Path
from typing import Optional, Callable, Tuple

from config import RECORDINGS_DIR, TEMP_DIR


class Muxer:
    """
    Manages non-blocking merging of raw video (MP4) and audio (WAV) streams
    into a production-grade MP4 container using FFmpeg with NVENC acceleration or libx264.
    """

    def __init__(self):
        self.ffmpeg_path = self._find_ffmpeg()
        self.supports_nvenc = self._check_nvenc_support()
        self.is_muxing = False

    @staticmethod
    def _find_ffmpeg() -> Optional[str]:
        """
        Locate ffmpeg binary on system PATH or local application directories.
        """
        # 1. System PATH
        system_ffmpeg = shutil.which("ffmpeg")
        if system_ffmpeg:
            return system_ffmpeg

        # 2. Common Windows paths
        win_candidates = [
            Path("C:/ffmpeg/bin/ffmpeg.exe"),
            Path("C:/Program Files/ffmpeg/bin/ffmpeg.exe"),
            Path(os.environ.get("LOCALAPPDATA", "")) / "ffmpeg/bin/ffmpeg.exe",
            Path(__file__).resolve().parent / "ffmpeg/bin/ffmpeg.exe",
        ]
        for candidate in win_candidates:
            if candidate.exists() and candidate.is_file():
                return str(candidate)

        return None

    def _check_nvenc_support(self) -> bool:
        """
        Check if NVIDIA NVENC H.264 encoder is supported on this machine.
        """
        if not self.ffmpeg_path:
            return False
        try:
            result = subprocess.run(
                [self.ffmpeg_path, "-encoders"],
                capture_output=True,
                text=True,
                timeout=5,
                creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
            )
            return "h264_nvenc" in result.stdout
        except Exception:
            return False

    def generate_output_filename(self) -> Path:
        """
        Generate timestamped output file: Meeting_YYYY-MM-DD_HH-MM-SS.mp4
        """
        now = datetime.datetime.now()
        timestamp = now.strftime("%Y-%m-%d_%H-%M-%S")
        filename = f"Meeting_{timestamp}.mp4"
        return RECORDINGS_DIR / filename

    def mux_async(
        self,
        raw_video_path: Path,
        raw_audio_path: Path,
        fps: int = 30,
        enable_nvenc: bool = True,
        on_complete: Optional[Callable[[bool, str, Optional[Path]], None]] = None
    ):
        """
        Start non-blocking background thread to perform FFmpeg muxing.
        Callback signature: on_complete(success: bool, message: str, output_path: Optional[Path])
        """
        thread = threading.Thread(
            target=self._mux_worker,
            args=(raw_video_path, raw_audio_path, fps, enable_nvenc, on_complete),
            name="FFmpegMuxerThread",
            daemon=True
        )
        self.is_muxing = True
        thread.start()

    def _mux_worker(
        self,
        raw_video_path: Path,
        raw_audio_path: Path,
        fps: int,
        enable_nvenc: bool,
        on_complete: Optional[Callable[[bool, str, Optional[Path]], None]]
    ):
        output_file = self.generate_output_filename()

        if not self.ffmpeg_path:
            msg = (
                "FFmpeg is not installed or not found in system PATH. "
                "Raw video and audio files were preserved in Recordings/.temp/"
            )
            print(f"[Muxer Error] {msg}")
            self.is_muxing = False
            if on_complete:
                on_complete(False, msg, None)
            return

        use_nvenc = enable_nvenc and self.supports_nvenc

        # Build FFmpeg command with precise A/V synchronization
        # -vsync 1: duplicate/drop frames to achieve constant frame rate
        # -async 1: audio sync
        # -movflags +faststart: allows instant playback
        if use_nvenc:
            video_codec = "h264_nvenc"
            preset = "p4"  # Medium NVENC preset for balanced speed/quality
            extra_v_args = ["-preset", preset, "-rc", "vbr", "-cq", "23"]
        else:
            video_codec = "libx264"
            extra_v_args = ["-preset", "veryfast", "-crf", "22", "-pix_fmt", "yuv420p"]

        cmd = [
            self.ffmpeg_path,
            "-y",                        # Overwrite output
            "-i", str(raw_video_path),   # Input 0: Raw video
            "-i", str(raw_audio_path),   # Input 1: Raw WAV audio
            "-c:v", video_codec,
            *extra_v_args,
            "-r", str(fps),
            "-c:a", "aac",
            "-b:a", "192k",
            "-ar", "44100",
            "-async", "1",
            "-vsync", "1",
            "-shortest",                 # Terminate at shortest stream end
            "-movflags", "+faststart",
            str(output_file)
        ]

        print(f"[Muxer] Running FFmpeg command: {' '.join(cmd)}")

        creation_flags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0

        try:
            process = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True,
                creationflags=creation_flags
            )

            # Cleanup temporary raw streams upon successful mux
            try:
                if raw_video_path.exists():
                    raw_video_path.unlink()
                if raw_audio_path.exists():
                    raw_audio_path.unlink()
            except Exception as e:
                print(f"[Muxer] Cleanup warning: {e}")

            self.is_muxing = False
            success_msg = f"Meeting successfully saved to: {output_file.name}"
            print(f"[Muxer] {success_msg}")
            if on_complete:
                on_complete(True, success_msg, output_file)

        except subprocess.CalledProcessError as e:
            # Fallback to libx264 if NVENC failed
            if use_nvenc:
                print("[Muxer] NVENC failed. Retrying with CPU libx264 fallback...")
                self._mux_worker(raw_video_path, raw_audio_path, fps, False, on_complete)
                return

            self.is_muxing = False
            err_msg = f"FFmpeg failed with exit code {e.returncode}: {e.stderr}"
            print(f"[Muxer Error] {err_msg}")
            if on_complete:
                on_complete(False, err_msg, None)

        except Exception as e:
            self.is_muxing = False
            err_msg = f"Unexpected error during muxing: {e}"
            print(f"[Muxer Error] {err_msg}")
            if on_complete:
                on_complete(False, err_msg, None)
