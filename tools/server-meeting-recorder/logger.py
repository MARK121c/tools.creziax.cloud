import sys
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
from config import settings

def setup_logger(name: str = "meeting_recorder") -> logging.Logger:
    """
    Sets up a production-grade logger with console output and rotating file storage.
    """
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    # Avoid duplicate handlers on reloads
    if logger.handlers:
        return logger

    # Log format
    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] [%(name)s:%(lineno)d] - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # 1. Console Handler (for Docker stdout & journalctl)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # 2. Rotating File Handler (10MB max, 5 backup files)
    log_file = settings.LOG_DIR / "service.log"
    file_handler = RotatingFileHandler(
        filename=str(log_file),
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=5,
        encoding="utf-8"
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    # 3. Error-only Rotating File Handler
    error_file = settings.LOG_DIR / "errors.log"
    error_handler = RotatingFileHandler(
        filename=str(error_file),
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8"
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(formatter)
    logger.addHandler(error_handler)

    return logger

logger = setup_logger()
