import os
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    """
    Production configuration settings loaded from environment variables or .env file.
    """
    APP_NAME: str = Field(default="Creziax Server Meeting Recorder", env="APP_NAME")
    ENVIRONMENT: str = Field(default="production", env="ENVIRONMENT")
    HOST: str = Field(default="0.0.0.0", env="HOST")
    PORT: int = Field(default=8080, env="PORT")
    API_KEY: str = Field(default="", env="API_KEY")

    # Directories
    BASE_DIR: Path = Path(__file__).resolve().parent
    RECORDINGS_DIR: Path = Field(default=Path(__file__).resolve().parent / "recordings", env="RECORDINGS_DIR")
    LOG_DIR: Path = Field(default=Path(__file__).resolve().parent / "logs", env="LOG_DIR")

    # Virtual Display & Audio Environment
    XVFB_DISPLAY: str = Field(default=":99", env="XVFB_DISPLAY")
    SCREEN_WIDTH: int = Field(default=1920, env="SCREEN_WIDTH")
    SCREEN_HEIGHT: int = Field(default=1080, env="SCREEN_HEIGHT")
    SCREEN_DEPTH: int = Field(default=24, env="SCREEN_DEPTH")
    PULSE_SINK_NAME: str = Field(default="CreziaxVirtualSink", env="PULSE_SINK_NAME")

    # Recording Defaults
    DEFAULT_FPS: int = Field(default=30, env="DEFAULT_FPS")
    VIDEO_CODEC: str = Field(default="libx264", env="VIDEO_CODEC")
    VIDEO_PRESET: str = Field(default="veryfast", env="VIDEO_PRESET")
    VIDEO_CRF: int = Field(default=23, env="VIDEO_CRF")
    AUDIO_CODEC: str = Field(default="aac", env="AUDIO_CODEC")
    AUDIO_BITRATE: str = Field(default="192k", env="AUDIO_BITRATE")

    # Bot defaults
    DEFAULT_BOT_NAME: str = Field(default="Creziax Recorder Bot", env="DEFAULT_BOT_NAME")
    DEFAULT_MAX_DURATION_MINUTES: int = Field(default=180, env="DEFAULT_MAX_DURATION_MINUTES")

    # Storage Retention
    RETENTION_DAYS: int = Field(default=30, env="RETENTION_DAYS")
    MAX_DISK_USAGE_PERCENT: int = Field(default=90, env="MAX_DISK_USAGE_PERCENT")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()

# Ensure directories exist
settings.RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)
settings.LOG_DIR.mkdir(parents=True, exist_ok=True)
