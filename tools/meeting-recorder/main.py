"""
Main Entry Point for Stealth Meeting Recorder Pro
Orchestrates PyQt6 QApplication, FloatingWidget UI, AudioEngine, VideoEngine,
Muxer, and System Tray Icon integration.
"""

import sys
import os
from pathlib import Path
from PyQt6.QtCore import Qt, QObject, pyqtSignal
from PyQt6.QtWidgets import (
    QApplication, QSystemTrayIcon, QMenu, QMessageBox
)
from PyQt6.QtGui import QIcon, QAction, QPixmap, QColor, QPainter, QBrush

from config import (
    load_settings, save_settings, RECORDINGS_DIR, TEMP_DIR,
    DEFAULT_FPS
)
from audio_engine import AudioEngine, SOUNDCARD_AVAILABLE
from video_engine import VideoEngine, MSS_AVAILABLE
from muxer import Muxer
from gui import FloatingWidget


def create_tray_icon_pixmap(color: QColor) -> QPixmap:
    """Generate a clean circular status icon for the system tray."""
    pixmap = QPixmap(32, 32)
    pixmap.fill(Qt.GlobalColor.transparent)
    painter = QPainter(pixmap)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing)
    painter.setBrush(QBrush(color))
    painter.setPen(Qt.PenStyle.NoPen)
    painter.drawEllipse(4, 4, 24, 24)
    painter.end()
    return pixmap


class RecorderCoordinator(QObject):
    """
    Coordinates state between UI, Audio Engine, Video Engine, and Muxer.
    """
    muxing_finished = pyqtSignal(bool, str, object)

    def __init__(self, app: QApplication):
        super().__init__()
        self.app = app
        self.settings = load_settings()

        # Initialize engines
        self.audio_engine = AudioEngine(
            sample_rate=self.settings.get("audio_sample_rate", 44100)
        )
        self.video_engine = VideoEngine(
            target_fps=self.settings.get("fps", DEFAULT_FPS)
        )
        self.muxer = Muxer()

        # Configure initial device gains and modes
        self._apply_settings_to_engines()

        # Initialize Floating UI
        self.widget = FloatingWidget()
        self.widget.start_recording_requested.connect(self.start_recording)
        self.widget.pause_recording_requested.connect(self.pause_recording)
        self.widget.resume_recording_requested.connect(self.resume_recording)
        self.widget.stop_recording_requested.connect(self.stop_recording)
        self.widget.settings_updated.connect(self.on_settings_updated)

        # Temporary files for current session
        self.current_video_raw = TEMP_DIR / "raw_video.mp4"
        self.current_audio_raw = TEMP_DIR / "raw_audio.wav"

        # Signal bridge for background thread muxer callback
        self.muxing_finished.connect(self._on_muxing_finished)

        # System Tray setup
        self._setup_system_tray()

    def _setup_system_tray(self):
        self.tray_icon = QSystemTrayIcon(self)
        self.icon_idle = QIcon(create_tray_icon_pixmap(QColor(56, 189, 248)))   # Cyan
        self.icon_rec = QIcon(create_tray_icon_pixmap(QColor(239, 68, 68)))     # Red
        self.icon_paused = QIcon(create_tray_icon_pixmap(QColor(234, 179, 8)))   # Amber

        self.tray_icon.setIcon(self.icon_idle)
        self.tray_icon.setToolTip("Stealth Meeting Recorder Pro")

        # Context menu
        menu = QMenu()

        self.action_show = QAction("Show / Hide Widget", self)
        self.action_show.triggered.connect(self._toggle_widget_visibility)
        menu.addAction(self.action_show)

        menu.addSeparator()

        self.action_rec = QAction("Start Recording", self)
        self.action_rec.triggered.connect(self.start_recording)
        menu.addAction(self.action_rec)

        self.action_pause = QAction("Pause / Resume", self)
        self.action_pause.setEnabled(False)
        self.action_pause.triggered.connect(self._toggle_pause)
        menu.addAction(self.action_pause)

        self.action_stop = QAction("Stop & Save", self)
        self.action_stop.setEnabled(False)
        self.action_stop.triggered.connect(self.stop_recording)
        menu.addAction(self.action_stop)

        menu.addSeparator()

        action_folder = QAction("Open Recordings Folder", self)
        action_folder.triggered.connect(self._open_recordings_folder)
        menu.addAction(action_folder)

        action_exit = QAction("Exit Application", self)
        action_exit.triggered.connect(self.quit_application)
        menu.addAction(action_exit)

        self.tray_icon.setContextMenu(menu)
        self.tray_icon.show()

    def _apply_settings_to_engines(self):
        # Audio
        self.audio_engine.selected_mic_id = self.settings.get("mic_device_id")
        self.audio_engine.selected_speaker_id = self.settings.get("speaker_device_id")
        self.audio_engine.set_volumes(
            mic_gain=self.settings.get("mic_volume", 1.15),
            system_gain=self.settings.get("system_volume", 1.0),
            agc=self.settings.get("auto_gain_control", True)
        )

        # Video
        self.video_engine.set_target_fps(self.settings.get("fps", 30))
        mode = self.settings.get("capture_mode", "fullscreen")
        region = self.settings.get("custom_region")
        self.video_engine.set_region(mode, tuple(region) if region else None)

    def on_settings_updated(self, new_settings: dict):
        self.settings = new_settings
        self._apply_settings_to_engines()

    def start_recording(self):
        """Trigger simultaneous start of video and audio capture."""
        if not MSS_AVAILABLE or not SOUNDCARD_AVAILABLE:
            QMessageBox.critical(
                self.widget,
                "Dependencies Missing",
                "mss or soundcard library is missing. Please run:\n\npip install -r requirements.txt"
            )
            return

        # Prepare paths
        TEMP_DIR.mkdir(parents=True, exist_ok=True)
        self.current_video_raw = TEMP_DIR / f"raw_video_{os.getpid()}.mp4"
        self.current_audio_raw = TEMP_DIR / f"raw_audio_{os.getpid()}.wav"

        # Start Video Capture
        v_ok = self.video_engine.start_recording(self.current_video_raw)
        if not v_ok:
            QMessageBox.critical(
                self.widget,
                "Video Capture Error",
                self.video_engine.last_error or "Failed to start video capture."
            )
            return

        # Start Audio Capture
        a_ok = self.audio_engine.start_recording(self.current_audio_raw)
        if not a_ok:
            self.video_engine.stop_recording()
            QMessageBox.warning(
                self.widget,
                "Audio Capture Warning",
                f"Audio initialization failed:\n{self.audio_engine.last_error}\n\nRecording aborted."
            )
            return

        # Update UI & Tray
        self.widget.set_recording_state(True)
        self.tray_icon.setIcon(self.icon_rec)
        self.action_rec.setEnabled(False)
        self.action_pause.setEnabled(True)
        self.action_stop.setEnabled(True)

    def pause_recording(self):
        self.video_engine.pause()
        self.audio_engine.pause()
        self.tray_icon.setIcon(self.icon_paused)

    def resume_recording(self):
        self.video_engine.resume()
        self.audio_engine.resume()
        self.tray_icon.setIcon(self.icon_rec)

    def _toggle_pause(self):
        if not self.widget.is_recording:
            return
        if self.widget.is_paused:
            self.resume_recording()
            self.widget._on_pause_clicked()
        else:
            self.pause_recording()
            self.widget._on_pause_clicked()

    def stop_recording(self):
        """Finalize raw streams and trigger FFmpeg background muxing."""
        self.widget.set_recording_state(False)
        self.tray_icon.setIcon(self.icon_idle)
        self.action_rec.setEnabled(True)
        self.action_pause.setEnabled(False)
        self.action_stop.setEnabled(False)

        # Stop streams
        self.video_engine.stop_recording()
        self.audio_engine.stop_recording()

        # Trigger background muxer
        self.tray_icon.showMessage(
            "Stealth Meeting Recorder",
            "Finalizing meeting capture & merging audio/video...",
            QSystemTrayIcon.MessageIcon.Information,
            3000
        )

        def on_complete(success: bool, msg: str, output_path):
            self.muxing_finished.emit(success, msg, output_path)

        self.muxer.mux_async(
            raw_video_path=self.current_video_raw,
            raw_audio_path=self.current_audio_raw,
            fps=self.video_engine.target_fps,
            enable_nvenc=self.settings.get("enable_nvenc", True),
            on_complete=on_complete
        )

    def _on_muxing_finished(self, success: bool, message: str, output_path):
        if success and output_path:
            self.tray_icon.showMessage(
                "Recording Saved Successfully! 🎥",
                f"File: {Path(output_path).name}\nSaved to ./Recordings/",
                QSystemTrayIcon.MessageIcon.Information,
                5000
            )
        else:
            self.tray_icon.showMessage(
                "Muxing Alert",
                message,
                QSystemTrayIcon.MessageIcon.Warning,
                5000
            )

    def _toggle_widget_visibility(self):
        if self.widget.isVisible():
            self.widget.hide()
        else:
            self.widget.show()

    def _open_recordings_folder(self):
        try:
            if sys.platform == "win32":
                os.startfile(str(RECORDINGS_DIR))
            else:
                import subprocess
                subprocess.run(["open" if sys.platform == "darwin" else "xdg-open", str(RECORDINGS_DIR)])
        except Exception as e:
            print(f"Could not open directory: {e}")

    def quit_application(self):
        if self.widget.is_recording:
            self.stop_recording()
        self.app.quit()


def main():
    # High DPI Scaling for crisp rendering on 4K/Retina displays
    if hasattr(Qt.ApplicationAttribute, "AA_EnableHighDpiScaling"):
        QApplication.setAttribute(Qt.ApplicationAttribute.AA_EnableHighDpiScaling, True)
    if hasattr(Qt.ApplicationAttribute, "AA_UseHighDpiPixmaps"):
        QApplication.setAttribute(Qt.ApplicationAttribute.AA_UseHighDpiPixmaps, True)

    app = QApplication(sys.argv)
    app.setQuitOnLastWindowClosed(False)

    coordinator = RecorderCoordinator(app)

    # Position widget neatly at top center of primary screen
    screen = app.primaryScreen()
    if screen:
        screen_geo = screen.geometry()
        x = (screen_geo.width() - coordinator.widget.width()) // 2
        y = 30  # 30px from top
        coordinator.widget.move(x, y)

    coordinator.widget.show()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
