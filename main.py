import logging

from config.logging_config import setup_logging
from config.settings import settings
from src.detection.detection_service import run_detection_service


def main() -> None:
    setup_logging()
    logger = logging.getLogger(__name__)

    logger.info("=== Walkway Detection System ===")
    logger.info(
        "Company: %s | Device: %s",
        settings.COMPANY_CODE,
        settings.DEVICE,
    )

    run_detection_service()


if __name__ == "__main__":
    main()
