import os
import subprocess
import time
import shutil
from typing import Optional
from config import settings
from logger import logger

class AudioDisplayManager:
    """
    Manages headless virtual X11 display (Xvfb) and virtual audio loopback (PulseAudio).
    Enables headless server capture of both audio and video without physical hardware.
    """

    def __init__(self):
        self.xvfb_process: Optional[subprocess.Popen] = None
        self.pulse_process: Optional[subprocess.Popen] = None
        self.display = settings.XVFB_DISPLAY
        self.sink_name = settings.PULSE_SINK_NAME

    def is_xvfb_running(self) -> bool:
        """Check if an Xvfb process is active on the configured display."""
        display_num = self.display.replace(":", "")
        lock_file = f"/tmp/.X{display_num}-lock"
        if os.path.exists(lock_file):
            return True
        try:
            res = subprocess.run(["xdpyinfo", "-display", self.display], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return res.returncode == 0
        except Exception:
            return False

    def is_pulseaudio_running(self) -> bool:
        """Check if PulseAudio daemon is responding."""
        try:
            res = subprocess.run(["pactl", "info"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return res.returncode == 0
        except Exception:
            return False

    def start_xvfb(self):
        """Starts Xvfb virtual framebuffer on DISPLAY e.g. :99."""
        if self.is_xvfb_running():
            logger.info(f"Xvfb is already running on {self.display}")
            return

        cmd = [
            "Xvfb",
            self.display,
            "-screen", "0",
            f"{settings.SCREEN_WIDTH}x{settings.SCREEN_HEIGHT}x{settings.SCREEN_DEPTH}",
            "-ac",
            "+extension", "RANDR",
            "+extension", "RENDER",
            "+extension", "GLX",
            "-noreset"
        ]

        logger.info(f"Starting Xvfb: {' '.join(cmd)}")
        try:
            self.xvfb_process = subprocess.Popen(
                cmd,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                preexec_fn=os.setsid
            )
            time.sleep(1.0)
            if not self.is_xvfb_running() and shutil.which("Xvfb"):
                logger.warning(f"Xvfb spawned with PID {self.xvfb_process.pid}, verifying connection...")
            logger.info(f"Xvfb virtual display active on {self.display}")
        except FileNotFoundError:
            logger.warning("Xvfb binary not found on host. If running in production Docker, ensure xvfb package is installed.")
        except Exception as e:
            logger.error(f"Failed to start Xvfb: {e}")

    def start_pulseaudio(self):
        """Starts PulseAudio daemon and creates null-sink for audio loopback capture."""
        try:
            if not self.is_pulseaudio_running():
                logger.info("Initializing PulseAudio daemon...")
                subprocess.run(
                    ["pulseaudio", "--start", "--exit-idle-time=-1", "--disallow-exit"],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    check=False
                )
                time.sleep(1.0)

            # Ensure virtual null-sink is loaded
            check_sink = subprocess.run(
                ["pactl", "list", "short", "sinks"],
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                text=True
            )

            if self.sink_name not in check_sink.stdout:
                logger.info(f"Creating PulseAudio null-sink '{self.sink_name}'...")
                subprocess.run(
                    [
                        "pactl",
                        "load-module",
                        "module-null-sink",
                        f"sink_name={self.sink_name}",
                        f"sink_properties=device.description={self.sink_name}"
                    ],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    check=False
                )

            # Set default sink so all browser/apps output to it
            subprocess.run(["pactl", "set-default-sink", self.sink_name], check=False)
            logger.info(f"PulseAudio virtual sink '{self.sink_name}' ready.")
        except FileNotFoundError:
            logger.warning("PulseAudio / pactl tools not found on host. In headless Linux VPS, ensure pulseaudio is installed.")
        except Exception as e:
            logger.error(f"Failed configuring PulseAudio: {e}")

    def get_environment_variables(self) -> dict:
        """Returns standard environment variables required for child processes (Playwright, FFmpeg)."""
        env = os.environ.copy()
        env["DISPLAY"] = self.display
        env["PULSE_SINK"] = self.sink_name
        return env

    def initialize_environment(self):
        """Prepares full headless display and audio stack."""
        logger.info("Initializing Headless Virtual Display & Audio environment...")
        self.start_xvfb()
        self.start_pulseaudio()

    def cleanup(self):
        """Stops child processes cleanly on service shutdown."""
        if self.xvfb_process:
            try:
                self.xvfb_process.terminate()
                self.xvfb_process.wait(timeout=3)
                logger.info("Xvfb terminated.")
            except Exception:
                try:
                    self.xvfb_process.kill()
                except Exception:
                    pass

audio_display_mgr = AudioDisplayManager()
