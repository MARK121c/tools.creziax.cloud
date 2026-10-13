"""
Video Engine for Stealth Meeting Recorder Pro
High-performance screen grabber using mss and OpenCV VideoWriter with multi-threading,
FPS regulation, and custom region / full screen support.
"""

import time
import queue
import threading
import traceback
import cv2
import numpy as np
from pathlib import Path
from typing import Optional, Dict, Tuple

try:
    import mss
    MSS_AVAILABLE = True
except ImportError:
    mss = None
    MSS_AVAILABLE = False


class VideoEngine:
    """
    High-performance video engine capturing screen frames via mss at target FPS (30/60),
    buffered through an asynchronous queue to an OpenCV VideoWriter thread.
    """

    def __init__(self, target_fps: int = 30):
        self.target_fps = target_fps
        self.frame_interval = 1.0 / self.target_fps

        self.is_recording = False
        self.is_paused = False
        self._stop_event = threading.Event()

        self.capture_mode = "fullscreen"  # "fullscreen" or "region"
        self.custom_region: Optional[Dict[str, int]] = None  # {'top': y, 'left': x, 'width': w, 'height': h}

        self.output_video_path: Optional[Path] = None
        self._frame_queue: queue.Queue = queue.Queue(maxsize=120)

        self._grab_thread: Optional[threading.Thread] = None
        self._write_thread: Optional[threading.Thread] = None

        self.total_frames_captured = 0
        self.recorded_duration = 0.0
        self.last_error: Optional[str] = None

        # Capture dimensions
        self.capture_width = 1920
        self.capture_height = 1080

    def set_target_fps(self, fps: int):
        """Set target FPS (e.g. 30 or 60)."""
        self.target_fps = max(10, min(120, fps))
        self.frame_interval = 1.0 / self.target_fps

    def set_region(self, mode: str, region_rect: Optional[Tuple[int, int, int, int]] = None):
        """
        Configure capture mode:
        mode: 'fullscreen' or 'region'
        region_rect: (x, y, width, height) if mode == 'region'
        """
        self.capture_mode = mode
        if mode == "region" and region_rect:
            x, y, w, h = region_rect
            # Dimensions must be even for standard video encoders
            w = w if w % 2 == 0 else w - 1
            h = h if h % 2 == 0 else h - 1
            self.custom_region = {
                "left": int(x),
                "top": int(y),
                "width": max(64, int(w)),
                "height": max(64, int(h)),
            }
        else:
            self.custom_region = None

    def start_recording(self, output_video_path: Path) -> bool:
        """
        Start grabber and writer threads.
        """
        if not MSS_AVAILABLE:
            self.last_error = "mss library is not installed."
            return False

        if self.is_recording:
            return False

        self.output_video_path = Path(output_video_path)
        self.output_video_path.parent.mkdir(parents=True, exist_ok=True)

        self._stop_event.clear()
        self.is_recording = True
        self.is_paused = False
        self.total_frames_captured = 0
        self.recorded_duration = 0.0

        # Clear queue
        while not self._frame_queue.empty():
            try:
                self._frame_queue.get_nowait()
            except queue.Empty:
                break

        # Start grabber and writer
        self._write_thread = threading.Thread(
            target=self._writer_loop,
            name="VideoWriterThread",
            daemon=True
        )
        self._write_thread.start()

        self._grab_thread = threading.Thread(
            target=self._grabber_loop,
            name="ScreenGrabberThread",
            daemon=True
        )
        self._grab_thread.start()

        return True

    def pause(self):
        """Pause capture without closing video stream."""
        self.is_paused = True

    def resume(self):
        """Resume capture."""
        self.is_paused = False

    def stop_recording(self) -> Optional[Path]:
        """
        Stop capture, flush frame queue, and close OpenCV VideoWriter.
        Returns the path to the raw video file.
        """
        if not self.is_recording:
            return self.output_video_path

        self.is_recording = False
        self._stop_event.set()

        if self._grab_thread and self._grab_thread.is_alive():
            self._grab_thread.join(timeout=3.0)

        # Signal writer thread to finish
        self._frame_queue.put(None)
        if self._write_thread and self._write_thread.is_alive():
            self._write_thread.join(timeout=5.0)

        return self.output_video_path

    def _grabber_loop(self):
        """
        High-speed grab loop using mss targeting exact target_fps intervals.
        """
        try:
            with mss.mss() as sct:
                # Determine monitor bounds
                if self.capture_mode == "region" and self.custom_region:
                    monitor = self.custom_region
                else:
                    # Primary monitor is index 1
                    monitors = sct.monitors
                    monitor = monitors[1] if len(monitors) > 1 else monitors[0]

                # Ensure even width and height
                w = monitor["width"]
                h = monitor["height"]
                self.capture_width = w if w % 2 == 0 else w - 1
                self.capture_height = h if h % 2 == 0 else h - 1

                # Frame timing synchronization
                next_frame_time = time.perf_counter()

                while not self._stop_event.is_set():
                    current_time = time.perf_counter()

                    if self.is_paused:
                        time.sleep(0.05)
                        next_frame_time = time.perf_counter()
                        continue

                    if current_time >= next_frame_time:
                        # Grab screen frame
                        img = sct.grab(monitor)
                        # Convert mss ScreenShot to BGR NumPy array
                        frame = np.array(img, dtype=np.uint8)
                        # Drop alpha channel (BGRA -> BGR)
                        frame_bgr = frame[:, :, :3]

                        if frame_bgr.shape[1] != self.capture_width or frame_bgr.shape[0] != self.capture_height:
                            frame_bgr = frame_bgr[:self.capture_height, :self.capture_width]

                        # Push to writer queue (drop if full to prevent RAM leaks)
                        try:
                            self._frame_queue.put_nowait(frame_bgr)
                            self.total_frames_captured += 1
                            self.recorded_duration = self.total_frames_captured / self.target_fps
                        except queue.Full:
                            pass

                        # Regulate next scheduled tick
                        next_frame_time += self.frame_interval
                        if current_time > next_frame_time + 0.1:
                            # If fallen behind by more than 100ms, resync
                            next_frame_time = current_time + self.frame_interval
                    else:
                        sleep_dur = next_frame_time - current_time
                        if sleep_dur > 0.002:
                            time.sleep(sleep_dur * 0.75)

        except Exception as e:
            self.last_error = f"Video grab error: {e}\n{traceback.format_exc()}"
            print(f"[VideoEngine] Exception: {self.last_error}")

    def _writer_loop(self):
        """
        Background writer thread using OpenCV VideoWriter.
        """
        writer: Optional[cv2.VideoWriter] = None

        try:
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")

            while True:
                item = self._frame_queue.get()
                if item is None:
                    # Termination token
                    break

                if writer is None:
                    h, w = item.shape[:2]
                    self.capture_width = w
                    self.capture_height = h
                    writer = cv2.VideoWriter(
                        str(self.output_video_path),
                        fourcc,
                        float(self.target_fps),
                        (w, h),
                        isColor=True
                    )

                writer.write(item)

        except Exception as e:
            self.last_error = f"Video writer error: {e}\n{traceback.format_exc()}"
            print(f"[VideoEngine] Writer Exception: {self.last_error}")

        finally:
            if writer:
                writer.release()
