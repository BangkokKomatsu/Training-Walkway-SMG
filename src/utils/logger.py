"""
Helper สำหรับเรียก logger ในแต่ละโมดูล (wrapper รอบ logging.getLogger)
"""

import logging


def get_logger(name: str) -> logging.Logger:
    """คืน logger instance ตามชื่อโมดูล"""
    return logging.getLogger(name)
