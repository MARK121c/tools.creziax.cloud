"""
Audio Engine for Stealth Meeting Recorder Pro
Handles dual-channel audio capture (WASAPI Loopback system audio + Microphone)
using SoundCard with real-time mixing, automatic gain control (AGC), and WAV file streaming.
"""

import time
import wave
import threading
import traceback
import numpy as np
from pathlib import Path
from typing import Optional, List, Dict, Tuple

try:
    import soundcard as sc
    SOUNDCARD_AVAILABLE = True
except ImportError:
    sc = None
    SOUNDCARD_AVAILABLE = False


class AudioEngine:
    """
    Dual-stream high-fidelity audio recorder that captures desktop output (loopback)
    and microphone input concurrently, applies auto-gain control, and streams
    a synchronized stereo WAV file.
    """

    def __init__(self, sample_rate: int = 44100, chunk_size: int = 2048):
        self.sample_rate = sample_rate
        self.chunk_size = chunk_size
        self.channels = 2

        self.is_recording = False
        self.is_paused = False
        self._stop_event = threading.Event()
        self._record_thread: Optional[threading.Thread] = None

        self.output_wav_path: Optional[Path] = None
        self._wav_writer: Optional[wave.Wave_write] = None

        # Gain and volume settings
        self.mic_gain = 1.15
        self.system_gain = 1.00
        self.auto_gain_control = True

        # Selected devices (names or IDs)
        self.selected_mic_id: Optional[str] = None
        self.selected_speaker_id: Optional[str] = None

        # Statistics / status
        self.recorded_seconds = 0.0
        self.last_error: Optional[str] = None

    @staticmethod
    def get_devices() -> Dict[str, List[Dict[str, str]]]:
        """
        Enumerate available microphones and playback speakers (loopback sources).
        """
        devices = {"microphones": [], "speakers": []}
        if not SOUNDCARD_AVAILABLE:
            return devices

        try:
            mics = sc.all_microphones(include_loopback=False)
            for m in mics:
                devices["microphones"].append({
                    "id": m.id,
                    "name": m.name,
                    "channels": m.channels
                })
        except Exception as e:
            print(f"[AudioEngine] Error enumerating microphones: {e}")

        try:
            speakers = sc.all_speakers()
            for s in speakers:
                devices["speakers"].append({
                    "id": s.id,
                    "name": s.name,
                    "channels": s.channels
                })
        except Exception as e:
            print(f"[AudioEngine] Error enumerating speakers: {e}")

        return devices

    def set_volumes(self, mic_gain: float, system_gain: float, agc: bool = True):
        """Update volume gains and AGC state in real-time."""
        self.mic_gain = max(0.0, min(3.0, mic_gain))
        self.system_gain = max(0.0, min(3.0, system_gain))
        self.auto_gain_control = agc

    def start_recording(self, output_wav_path: Path) -> bool:
        """
        Initialize the WAV file and spawn the recording thread.
        """
        if not SOUNDCARD_AVAILABLE:
            self.last_error = "soundcard library is not installed."
            return False

        if self.is_recording:
            return False

        self.output_wav_path = Path(output_wav_path)
        self.output_wav_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            self._wav_writer = wave.open(str(self.output_wav_path), "wb")
            self._wav_writer.setnchannels(self.channels)
            self._wav_writer.setsampwidth(2)  # 16-bit PCM
            self._wav_writer.setframerate(self.sample_rate)
        except Exception as e:
            self.last_error = f"Failed to initialize WAV output: {e}"
            return False

        self._stop_event.clear()
        self.is_recording = True
        self.is_paused = False
        self.recorded_seconds = 0.0

        self._record_thread = threading.Thread(
            target=self._capture_loop,
            name="AudioCaptureThread",
            daemon=True
        )
        self._record_thread.start()
        return True

    def pause(self):
        """Pause capture without closing the audio file."""
        self.is_paused = True

    def resume(self):
        """Resume capture."""
        self.is_paused = False

    def stop_recording(self) -> Optional[Path]:
        """
        Stop audio capture, flush and close the WAV file.
        Returns the path to the saved WAV file.
        """
        if not self.is_recording:
            return self.output_wav_path

        self.is_recording = False
        self._stop_event.set()

        if self._record_thread and self._record_thread.is_alive():
            self._record_thread.join(timeout=3.0)

        if self._wav_writer:
            try:
                self._wav_writer.close()
            except Exception as e:
                print(f"[AudioEngine] Error closing WAV writer: {e}")
            self._wav_writer = None

        return self.output_wav_path

    def _resolve_devices(self) -> Tuple[Optional[object], Optional[object]]:
        """
        Resolve the SoundCard mic and loopback recorder instances.
        """
        mic = None
        loopback = None

        # Resolve Microphone
        try:
            if self.selected_mic_id:
                for m in sc.all_microphones(include_loopback=False):
                    if m.id == self.selected_mic_id:
                        mic = m
                        break
            if mic is None:
                mic = sc.default_microphone()
        except Exception as e:
            print(f"[AudioEngine] Could not bind mic: {e}")

        # Resolve Speaker Loopback
        try:
            speaker = None
            if self.selected_speaker_id:
                for s in sc.all_speakers():
                    if s.id == self.selected_speaker_id:
                        speaker = s
                        break
            if speaker is None:
                speaker = sc.default_speaker()

            if speaker:
                # On Windows, soundcard provides loopback recorder from speaker
                loopback = sc.get_microphone(id=speaker.id, include_loopback=True)
        except Exception as e:
            print(f"[AudioEngine] Could not bind loopback: {e}")

        return mic, loopback

    def _apply_agc_and_mix(
        self,
        loopback_data: Optional[np.ndarray],
        mic_data: Optional[np.ndarray]
    ) -> np.ndarray:
        """
        Mix system loopback and mic audio streams into a balanced stereo frame
        with soft-knee limiter and Auto-Gain Control.
        """
        # Ensure 2-channel float32
        target_len = self.chunk_size
        loop_stereo = np.zeros((target_len, 2), dtype=np.float32)
        mic_stereo = np.zeros((target_len, 2), dtype=np.float32)

        if loopback_data is not None and len(loopback_data) > 0:
            act_len = min(len(loopback_data), target_len)
            if loopback_data.ndim == 1:
                loop_stereo[:act_len, 0] = loopback_data[:act_len]
                loop_stereo[:act_len, 1] = loopback_data[:act_len]
            elif loopback_data.shape[1] >= 2:
                loop_stereo[:act_len, :] = loopback_data[:act_len, :2]
            else:
                loop_stereo[:act_len, 0] = loopback_data[:act_len, 0]
                loop_stereo[:act_len, 1] = loopback_data[:act_len, 0]

        if mic_data is not None and len(mic_data) > 0:
            act_len = min(len(mic_data), target_len)
            if mic_data.ndim == 1:
                mic_stereo[:act_len, 0] = mic_data[:act_len]
                mic_stereo[:act_len, 1] = mic_data[:act_len]
            elif mic_data.shape[1] >= 2:
                mic_stereo[:act_len, :] = mic_data[:act_len, :2]
            else:
                mic_stereo[:act_len, 0] = mic_data[:act_len, 0]
                mic_stereo[:act_len, 1] = mic_data[:act_len, 0]

        # Apply user gain multipliers
        loop_stereo *= self.system_gain
        mic_stereo *= self.mic_gain

        # Merge
        mixed = loop_stereo + mic_stereo

        # Auto-Gain Control (AGC) & Soft Limiter
        if self.auto_gain_control:
            # Measure peak
            peak = np.max(np.abs(mixed))
            if peak > 0.95:
                # Soft-clip using hyperbolic tangent compression
                mixed = np.tanh(mixed / peak) * 0.95
        else:
            mixed = np.clip(mixed, -1.0, 1.0)

        # Convert float32 [-1.0, 1.0] to int16 PCM
        int16_pcm = (mixed * 32767.0).astype(np.int16)
        return int16_pcm

    def _capture_loop(self):
        """
        Worker thread capturing chunks concurrently from loopback and mic.
        """
        mic_dev, loop_dev = self._resolve_devices()

        if mic_dev is None and loop_dev is None:
            self.last_error = "No functional audio devices found."
            return

        total_frames = 0
        mic_recorder = None
        loop_recorder = None

        try:
            # Open context recorders
            # We record block-by-block with chunk_size
            if mic_dev:
                mic_recorder = mic_dev.recorder(
                    samplerate=self.sample_rate,
                    channels=min(mic_dev.channels, 2),
                    blocksize=self.chunk_size
                )
                mic_recorder.__enter__()

            if loop_dev:
                loop_recorder = loop_dev.recorder(
                    samplerate=self.sample_rate,
                    channels=min(loop_dev.channels, 2),
                    blocksize=self.chunk_size
                )
                loop_recorder.__enter__()

            silence_chunk = np.zeros((self.chunk_size, 2), dtype=np.int16).tobytes()

            while not self._stop_event.is_set():
                if self.is_paused:
                    time.sleep(0.05)
                    continue

                loop_chunk = None
                mic_chunk = None

                # Capture from loopback
                if loop_recorder:
                    try:
                        loop_chunk = loop_recorder.record(numframes=self.chunk_size)
                    except Exception:
                        loop_chunk = None

                # Capture from mic
                if mic_recorder:
                    try:
                        mic_chunk = mic_recorder.record(numframes=self.chunk_size)
                    except Exception:
                        mic_chunk = None

                # Mix and write
                if loop_chunk is not None or mic_chunk is not None:
                    pcm_data = self._apply_agc_and_mix(loop_chunk, mic_chunk)
                    raw_bytes = pcm_data.tobytes()
                else:
                    raw_bytes = silence_chunk

                if self._wav_writer and not self.is_paused:
                    self._wav_writer.writeframes(raw_bytes)
                    total_frames += self.chunk_size
                    self.recorded_seconds = total_frames / self.sample_rate

        except Exception as e:
            self.last_error = f"Audio capture error: {e}\n{traceback.format_exc()}"
            print(f"[AudioEngine] Exception in capture loop: {self.last_error}")

        finally:
            if mic_recorder:
                try:
                    mic_recorder.__exit__(None, None, None)
                except Exception:
                    pass
            if loop_recorder:
                try:
                    loop_recorder.__exit__(None, None, None)
                except Exception:
                    pass
