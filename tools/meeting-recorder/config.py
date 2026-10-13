"""
Configuration module for Stealth Meeting Recorder Pro
Handles global constants, settings persistence, and platform helpers.
"""

import os
import sys
import json
import ctypes
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent
RECORDINGS_DIR = BASE_DIR / "Recordings"
TEMP_DIR = RECORDINGS_DIR / ".temp"
SETTINGS_FILE = BASE_DIR / "settings.json"

# Ensure directories exist
RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# Default Recording Parameters
DEFAULT_FPS = 30
DEFAULT_SAMPLE_RATE = 44100
DEFAULT_AUDIO_CHANNELS = 2  # Stereo
DEFAULT_AUDIO_CHUNK = 2048
DEFAULT_VIDEO_CODEC = "h264_nvenc"  # Fallback to libx264 in muxer

# Windows API Constants
# WDA_EXCLUDEFROMCAPTURE (0x00000011) hides the window from screen capture on Windows 10 build 2004+
WDA_NONE = 0x00000000
WDA_MONITOR = 0x00000001
WDA_EXCLUDEFROMCAPTURE = 0x00000011


def exclude_window_from_capture(hwnd: int) -> bool:
    """
    Excludes the specified window handle (HWND) from being captured by
    screen capture tools (like mss, OBS, Zoom screen share, Teams).
    Works on Windows 10 version 2004 (Build 19041) and newer.
    """
    if sys.platform != "win32":
        return False
    try:
        user32 = ctypes.windll.user32
        result = user32.SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)
        return bool(result != 0)
    except Exception as e:
        print(f"[Config] Warning: Could not set window display affinity: {e}")
        return False


DEFAULT_SETTINGS = {
    "fps": 30,
    "capture_mode": "fullscreen",  # 'fullscreen' or 'region'
    "custom_region": None,         # [x, y, width, height]
    "audio_sample_rate": 44100,
    "mic_device_id": None,
    "speaker_device_id": None,
    "mic_volume": 1.1,             # Boost factor
    "system_volume": 1.0,
    "auto_gain_control": True,
    "enable_nvenc": True,
    "hide_widget_from_recording": True
}


def load_settings() -> dict:
    """Load settings from JSON file or return defaults."""
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                merged = DEFAULT_SETTINGS.copy()
                merged.update(data)
                return merged
        except Exception as e:
            print(f"[Config] Error reading settings file: {e}")
    return DEFAULT_SETTINGS.copy()


def save_settings(settings: dict) -> bool:
    """Persist settings to JSON file."""
    try:
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(settings, f, indent=4)
        return True
    except Exception as e:
        print(f"[Config] Error saving settings: {e}")
        return False
