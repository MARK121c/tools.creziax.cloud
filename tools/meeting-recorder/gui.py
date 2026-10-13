"""
GUI Module for Stealth Meeting Recorder Pro
Features a modern, frameless, translucent, dark-themed floating widget that stays
Always on Top with smooth drag-and-drop, interactive region selector, and settings dialog.
Excludes itself from screen capture on Windows 10/11 using SetWindowDisplayAffinity.
"""

import sys
import os
from typing import Optional, Tuple
from PyQt6.QtCore import (
    Qt, QPoint, QTimer, QTime, pyqtSignal, QRect
)
from PyQt6.QtGui import (
    QColor, QPainter, QBrush, QPen, QFont, QIcon, QCursor
)
from PyQt6.QtWidgets import (
    QWidget, QHBoxLayout, QVBoxLayout, QPushButton, QLabel,
    QDialog, QComboBox, QSlider, QCheckBox, QGroupBox,
    QFileDialog, QMessageBox, QFrame, QGridLayout
)

from config import (
    exclude_window_from_capture, load_settings, save_settings,
    RECORDINGS_DIR
)
from audio_engine import AudioEngine


class RegionSelectorOverlay(QWidget):
    """
    Transparent full-screen overlay enabling the user to drag and select
    a custom bounding-box recording region.
    """
    region_selected = pyqtSignal(int, int, int, int)

    def __init__(self):
        super().__init__()
        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint |
            Qt.WindowType.WindowStaysOnTopHint |
            Qt.WindowType.Tool
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, True)
        self.setCursor(QCursor(Qt.CursorShape.CrossCursor))

        self.start_pos: Optional[QPoint] = None
        self.end_pos: Optional[QPoint] = None
        self.is_selecting = False

    def show_selector(self):
        """Show across the primary screen geometry."""
        screen = self.screen()
        geom = screen.geometry()
        self.setGeometry(geom)
        self.start_pos = None
        self.end_pos = None
        self.is_selecting = False
        self.show()

    def mousePressEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.start_pos = event.pos()
            self.end_pos = self.start_pos
            self.is_selecting = True
            self.update()

    def mouseMoveEvent(self, event):
        if self.is_selecting:
            self.end_pos = event.pos()
            self.update()

    def mouseReleaseEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton and self.is_selecting:
            self.is_selecting = False
            if self.start_pos and self.end_pos:
                rect = QRect(self.start_pos, self.end_pos).normalized()
                if rect.width() > 30 and rect.height() > 30:
                    self.region_selected.emit(rect.x(), rect.y(), rect.width(), rect.height())
            self.close()

    def keyPressEvent(self, event):
        if event.key() == Qt.Key.Key_Escape:
            self.close()

    def paintEvent(self, event):
        painter = QPainter(self)
        # Dim background
        painter.fillRect(self.rect(), QColor(0, 0, 0, 100))

        if self.start_pos and self.end_pos:
            rect = QRect(self.start_pos, self.end_pos).normalized()
            # Clear selected rectangle
            painter.setCompositionMode(QPainter.CompositionMode.CompositionMode_Clear)
            painter.fillRect(rect, Qt.GlobalColor.transparent)

            # Draw glowing cyan border
            painter.setCompositionMode(QPainter.CompositionMode.CompositionMode_SourceOver)
            pen = QPen(QColor(0, 220, 255, 230), 2, Qt.PenStyle.DashLine)
            painter.setPen(pen)
            painter.drawRect(rect)

            # Draw size label
            painter.setPen(QColor(255, 255, 255, 220))
            painter.setFont(QFont("Segoe UI", 9, QFont.Weight.Bold))
            dim_text = f"{rect.width()} x {rect.height()}"
            painter.drawText(rect.x() + 8, rect.y() - 8 if rect.y() > 20 else rect.y() + 20, dim_text)


class SettingsDialog(QDialog):
    """
    Compact modern dark-themed settings dialog.
    """
    settings_changed = pyqtSignal(dict)

    def __init__(self, current_settings: dict, parent=None):
        super().__init__(parent)
        self.settings = current_settings.copy()
        self.setWindowTitle("Meeting Recorder Settings")
        self.setFixedSize(440, 480)
        self.setStyleSheet("""
            QDialog {
                background-color: #12141a;
                color: #e2e8f0;
                font-family: 'Segoe UI', sans-serif;
            }
            QLabel {
                color: #94a3b8;
                font-size: 12px;
            }
            QGroupBox {
                border: 1px solid #1e293b;
                border-radius: 8px;
                margin-top: 14px;
                padding-top: 10px;
                font-size: 12px;
                font-weight: bold;
                color: #38bdf8;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 4px;
            }
            QComboBox {
                background-color: #1e222d;
                border: 1px solid #334155;
                border-radius: 6px;
                padding: 6px 10px;
                color: #f8fafc;
                font-size: 11px;
            }
            QComboBox::drop-down {
                border: none;
            }
            QSlider::groove:horizontal {
                height: 4px;
                background: #334155;
                border-radius: 2px;
            }
            QSlider::sub-page:horizontal {
                background: #38bdf8;
                border-radius: 2px;
            }
            QSlider::handle:horizontal {
                background: #ffffff;
                border: 1px solid #38bdf8;
                width: 14px;
                margin-top: -5px;
                margin-bottom: -5px;
                border-radius: 7px;
            }
            QCheckBox {
                color: #cbd5e1;
                font-size: 12px;
            }
            QPushButton {
                background-color: #2563eb;
                color: white;
                border-radius: 6px;
                padding: 8px 16px;
                font-weight: bold;
                font-size: 12px;
                border: none;
            }
            QPushButton:hover {
                background-color: #1d4ed8;
            }
        """)

        self._init_ui()

    def _init_ui(self):
        layout = QVBoxLayout(self)
        layout.setSpacing(12)

        # 1. Video Options Group
        v_box = QGroupBox("Screen Capture Settings")
        v_layout = QGridLayout(v_box)

        v_layout.addWidget(QLabel("Target Frame Rate:"), 0, 0)
        self.fps_combo = QComboBox()
        self.fps_combo.addItems(["30 FPS (Recommended - Smooth & Light)", "60 FPS (Ultra Smooth)"])
        if self.settings.get("fps", 30) == 60:
            self.fps_combo.setCurrentIndex(1)
        v_layout.addWidget(self.fps_combo, 0, 1)

        v_layout.addWidget(QLabel("Capture Area:"), 1, 0)
        self.mode_combo = QComboBox()
        self.mode_combo.addItems(["Full Screen (Primary Monitor)", "Custom Selected Region"])
        if self.settings.get("capture_mode") == "region":
            self.mode_combo.setCurrentIndex(1)
        v_layout.addWidget(self.mode_combo, 1, 1)

        self.nvenc_check = QCheckBox("Enable Hardware Acceleration (NVENC H.264)")
        self.nvenc_check.setChecked(self.settings.get("enable_nvenc", True))
        v_layout.addWidget(self.nvenc_check, 2, 0, 1, 2)

        self.stealth_check = QCheckBox("Stealth Mode: Exclude Widget from Capture (Win10/11)")
        self.stealth_check.setChecked(self.settings.get("hide_widget_from_recording", True))
        v_layout.addWidget(self.stealth_check, 3, 0, 1, 2)

        layout.addWidget(v_box)

        # 2. Audio Options Group
        a_box = QGroupBox("Dual-Channel Audio Capture")
        a_layout = QGridLayout(a_box)

        # Query devices
        devices = AudioEngine.get_devices()

        a_layout.addWidget(QLabel("Microphone Input:"), 0, 0)
        self.mic_combo = QComboBox()
        self.mic_combo.addItem("Default System Microphone", None)
        for mic in devices.get("microphones", []):
            self.mic_combo.addItem(mic["name"], mic["id"])
        # Select active
        cur_mic = self.settings.get("mic_device_id")
        for i in range(self.mic_combo.count()):
            if self.mic_combo.itemData(i) == cur_mic:
                self.mic_combo.setCurrentIndex(i)
                break
        a_layout.addWidget(self.mic_combo, 0, 1)

        a_layout.addWidget(QLabel("System Loopback Audio:"), 1, 0)
        self.speaker_combo = QComboBox()
        self.speaker_combo.addItem("Default Playback Device (WASAPI Loopback)", None)
        for spk in devices.get("speakers", []):
            self.speaker_combo.addItem(spk["name"], spk["id"])
        cur_spk = self.settings.get("speaker_device_id")
        for i in range(self.speaker_combo.count()):
            if self.speaker_combo.itemData(i) == cur_spk:
                self.speaker_combo.setCurrentIndex(i)
                break
        a_layout.addWidget(self.speaker_combo, 1, 1)

        # Volume sliders
        a_layout.addWidget(QLabel("Mic Gain Boost:"), 2, 0)
        self.mic_slider = QSlider(Qt.Orientation.Horizontal)
        self.mic_slider.setRange(0, 200)
        self.mic_slider.setValue(int(self.settings.get("mic_volume", 1.15) * 100))
        a_layout.addWidget(self.mic_slider, 2, 1)

        a_layout.addWidget(QLabel("System Audio Level:"), 3, 0)
        self.sys_slider = QSlider(Qt.Orientation.Horizontal)
        self.sys_slider.setRange(0, 200)
        self.sys_slider.setValue(int(self.settings.get("system_volume", 1.0) * 100))
        a_layout.addWidget(self.sys_slider, 3, 1)

        self.agc_check = QCheckBox("Real-Time Auto Gain Control (Prevent Echo & Clipping)")
        self.agc_check.setChecked(self.settings.get("auto_gain_control", True))
        a_layout.addWidget(self.agc_check, 4, 0, 1, 2)

        layout.addWidget(a_box)

        # Open recordings button
        open_btn = QPushButton("📁 Open Recordings Directory")
        open_btn.setStyleSheet("background-color: #1e293b; color: #38bdf8;")
        open_btn.clicked.connect(self._open_recordings_folder)
        layout.addWidget(open_btn)

        # Bottom buttons
        btn_layout = QHBoxLayout()
        cancel_btn = QPushButton("Cancel")
        cancel_btn.setStyleSheet("background-color: #334155;")
        cancel_btn.clicked.connect(self.reject)

        save_btn = QPushButton("Save & Apply")
        save_btn.clicked.connect(self._save_and_apply)

        btn_layout.addStretch()
        btn_layout.addWidget(cancel_btn)
        btn_layout.addWidget(save_btn)
        layout.addLayout(btn_layout)

    def _open_recordings_folder(self):
        try:
            if sys.platform == "win32":
                os.startfile(str(RECORDINGS_DIR))
            else:
                import subprocess
                subprocess.run(["open" if sys.platform == "darwin" else "xdg-open", str(RECORDINGS_DIR)])
        except Exception as e:
            print(f"Could not open directory: {e}")

    def _save_and_apply(self):
        self.settings["fps"] = 60 if self.fps_combo.currentIndex() == 1 else 30
        self.settings["capture_mode"] = "region" if self.mode_combo.currentIndex() == 1 else "fullscreen"
        self.settings["enable_nvenc"] = self.nvenc_check.isChecked()
        self.settings["hide_widget_from_recording"] = self.stealth_check.isChecked()
        self.settings["mic_device_id"] = self.mic_combo.currentData()
        self.settings["speaker_device_id"] = self.speaker_combo.currentData()
        self.settings["mic_volume"] = self.mic_slider.value() / 100.0
        self.settings["system_volume"] = self.sys_slider.value() / 100.0
        self.settings["auto_gain_control"] = self.agc_check.isChecked()

        save_settings(self.settings)
        self.settings_changed.emit(self.settings)
        self.accept()


class FloatingWidget(QWidget):
    """
    Modern translucent dark-themed floating pill widget that stays Always on Top.
    Includes drag-and-drop, timer display, record/pause/stop buttons, and region picker.
    """

    start_recording_requested = pyqtSignal()
    pause_recording_requested = pyqtSignal()
    resume_recording_requested = pyqtSignal()
    stop_recording_requested = pyqtSignal()
    settings_updated = pyqtSignal(dict)

    def __init__(self):
        super().__init__()
        self.settings = load_settings()

        # Window flags: frameless, always-on-top, tool (no taskbar clutter)
        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint |
            Qt.WindowType.WindowStaysOnTopHint |
            Qt.WindowType.Tool
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, True)

        # Dragging mechanics
        self._is_dragging = False
        self._drag_start_position = QPoint()

        # State
        self.is_recording = False
        self.is_paused = False
        self.recording_seconds = 0

        # Timer
        self.timer = QTimer(self)
        self.timer.setInterval(1000)
        self.timer.timeout.connect(self._on_timer_tick)

        # Region Selector Tool
        self.region_selector = RegionSelectorOverlay()
        self.region_selector.region_selected.connect(self._on_region_selected)

        self._init_ui()

    def showEvent(self, event):
        super().showEvent(event)
        # Apply Windows 10/11 stealth exclusion if enabled
        if self.settings.get("hide_widget_from_recording", True):
            hwnd = int(self.winId())
            success = exclude_window_from_capture(hwnd)
            if success:
                print("[GUI] Stealth Mode: Widget successfully hidden from screen capture!")

    def _init_ui(self):
        self.setFixedSize(360, 56)

        # Main horizontal layout
        layout = QHBoxLayout(self)
        layout.setContentsMargins(12, 6, 12, 6)
        layout.setSpacing(10)

        # Drag Handle Icon / Status Dot
        self.status_dot = QLabel("●")
        self.status_dot.setStyleSheet("color: #64748b; font-size: 14px;")
        self.status_dot.setToolTip("Drag here to move the widget anywhere on screen")
        layout.addWidget(self.status_dot)

        # Timer Display (00:00:00)
        self.timer_label = QLabel("00:00:00")
        self.timer_label.setStyleSheet("""
            color: #f1f5f9;
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 14px;
            font-weight: bold;
            padding: 2px 6px;
            background-color: #1e293b;
            border-radius: 6px;
        """)
        layout.addWidget(self.timer_label)

        # Separator Line
        sep = QFrame()
        sep.setFrameShape(QFrame.Shape.VLine)
        sep.setStyleSheet("color: #334155;")
        layout.addWidget(sep)

        # 🔴 Record / Action Button
        self.record_btn = QPushButton("⏺ REC")
        self.record_btn.setFixedSize(68, 34)
        self.record_btn.setStyleSheet("""
            QPushButton {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #ef4444, stop:1 #dc2626);
                color: #ffffff;
                font-size: 11px;
                font-weight: bold;
                border-radius: 8px;
                border: 1px solid #f87171;
            }
            QPushButton:hover {
                background: #b91c1c;
            }
        """)
        self.record_btn.clicked.connect(self._on_record_clicked)
        layout.addWidget(self.record_btn)

        # ⏸️ Pause / Resume Button
        self.pause_btn = QPushButton("⏸")
        self.pause_btn.setFixedSize(36, 34)
        self.pause_btn.setEnabled(False)
        self.pause_btn.setStyleSheet("""
            QPushButton {
                background-color: #334155;
                color: #f8fafc;
                font-size: 13px;
                font-weight: bold;
                border-radius: 8px;
                border: 1px solid #475569;
            }
            QPushButton:hover {
                background-color: #475569;
            }
            QPushButton:disabled {
                background-color: #1e293b;
                color: #64748b;
                border-color: #1e293b;
            }
        """)
        self.pause_btn.clicked.connect(self._on_pause_clicked)
        layout.addWidget(self.pause_btn)

        # ⏹️ Stop Button
        self.stop_btn = QPushButton("⏹")
        self.stop_btn.setFixedSize(36, 34)
        self.stop_btn.setEnabled(False)
        self.stop_btn.setStyleSheet("""
            QPushButton {
                background-color: #334155;
                color: #f8fafc;
                font-size: 13px;
                font-weight: bold;
                border-radius: 8px;
                border: 1px solid #475569;
            }
            QPushButton:hover {
                background-color: #dc2626;
                border-color: #f87171;
            }
            QPushButton:disabled {
                background-color: #1e293b;
                color: #64748b;
                border-color: #1e293b;
            }
        """)
        self.stop_btn.clicked.connect(self._on_stop_clicked)
        layout.addWidget(self.stop_btn)

        # 🗖 Region Picker Button
        self.region_btn = QPushButton("⛶")
        self.region_btn.setToolTip("Select Custom Recording Area (or Full Screen)")
        self.region_btn.setFixedSize(34, 34)
        self.region_btn.setStyleSheet("""
            QPushButton {
                background-color: #1e293b;
                color: #38bdf8;
                font-size: 14px;
                font-weight: bold;
                border-radius: 8px;
                border: 1px solid #334155;
            }
            QPushButton:hover {
                background-color: #0284c7;
                color: white;
            }
        """)
        self.region_btn.clicked.connect(self._on_pick_region)
        layout.addWidget(self.region_btn)

        # ⚙️ Settings Button
        self.settings_btn = QPushButton("⚙")
        self.settings_btn.setToolTip("Audio/Video Settings & Devices")
        self.settings_btn.setFixedSize(34, 34)
        self.settings_btn.setStyleSheet("""
            QPushButton {
                background-color: #1e293b;
                color: #cbd5e1;
                font-size: 14px;
                border-radius: 8px;
                border: 1px solid #334155;
            }
            QPushButton:hover {
                background-color: #334155;
                color: white;
            }
        """)
        self.settings_btn.clicked.connect(self._on_settings_clicked)
        layout.addWidget(self.settings_btn)

    def paintEvent(self, event):
        """Paint translucent glassmorphic dark container with smooth rounded pill."""
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        rect = self.rect()
        # Dark translucent background
        bg_color = QColor(15, 23, 42, 230)  # Slate-900 with 90% opacity
        painter.setBrush(QBrush(bg_color))

        # Glowing active border when recording
        if self.is_recording and not self.is_paused:
            border_color = QColor(239, 68, 68, 200)  # Red pulse
        elif self.is_paused:
            border_color = QColor(234, 179, 8, 200)  # Amber
        else:
            border_color = QColor(51, 65, 85, 180)  # Subtle Slate

        painter.setPen(QPen(border_color, 1.5))
        painter.drawRoundedRect(rect.adjusted(1, 1, -1, -1), 16, 16)

    # Mouse drag events
    def mousePressEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self._is_dragging = True
            self._drag_start_position = event.globalPosition().toPoint() - self.frameGeometry().topLeft()
            event.accept()

    def mouseMoveEvent(self, event):
        if self._is_dragging and event.buttons() == Qt.MouseButton.LeftButton:
            self.move(event.globalPosition().toPoint() - self._drag_start_position)
            event.accept()

    def mouseReleaseEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self._is_dragging = False
            event.accept()

    def _on_record_clicked(self):
        if not self.is_recording:
            self.start_recording_requested.emit()

    def _on_pause_clicked(self):
        if not self.is_recording:
            return
        if self.is_paused:
            self.resume_recording_requested.emit()
            self.is_paused = False
            self.pause_btn.setText("⏸")
            self.status_dot.setStyleSheet("color: #ef4444; font-size: 14px;")
            self.timer.start()
        else:
            self.pause_recording_requested.emit()
            self.is_paused = True
            self.pause_btn.setText("▶")
            self.status_dot.setStyleSheet("color: #eab308; font-size: 14px;")
            self.timer.stop()
        self.update()

    def _on_stop_clicked(self):
        if self.is_recording:
            self.stop_recording_requested.emit()

    def set_recording_state(self, active: bool):
        """Update widget buttons and status based on recording state."""
        self.is_recording = active
        self.is_paused = False

        if active:
            self.record_btn.setEnabled(False)
            self.record_btn.setText("● REC")
            self.pause_btn.setEnabled(True)
            self.pause_btn.setText("⏸")
            self.stop_btn.setEnabled(True)
            self.region_btn.setEnabled(False)
            self.status_dot.setStyleSheet("color: #ef4444; font-size: 14px;")
            self.recording_seconds = 0
            self.timer_label.setText("00:00:00")
            self.timer.start()
        else:
            self.record_btn.setEnabled(True)
            self.record_btn.setText("⏺ REC")
            self.pause_btn.setEnabled(False)
            self.pause_btn.setText("⏸")
            self.stop_btn.setEnabled(False)
            self.region_btn.setEnabled(True)
            self.status_dot.setStyleSheet("color: #64748b; font-size: 14px;")
            self.timer.stop()

        self.update()

    def _on_timer_tick(self):
        self.recording_seconds += 1
        hours = self.recording_seconds // 3600
        mins = (self.recording_seconds % 3600) // 60
        secs = self.recording_seconds % 60
        self.timer_label.setText(f"{hours:02d}:{mins:02d}:{secs:02d}")

    def _on_pick_region(self):
        self.region_selector.show_selector()

    def _on_region_selected(self, x: int, y: int, w: int, h: int):
        self.settings["capture_mode"] = "region"
        self.settings["custom_region"] = [x, y, w, h]
        save_settings(self.settings)
        self.settings_updated.emit(self.settings)

    def _on_settings_clicked(self):
        dlg = SettingsDialog(self.settings, self)
        dlg.settings_changed.connect(self._on_settings_saved)
        dlg.exec()

    def _on_settings_saved(self, new_settings: dict):
        self.settings = new_settings
        self.settings_updated.emit(self.settings)
