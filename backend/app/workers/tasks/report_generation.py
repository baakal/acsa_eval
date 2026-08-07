"""Background task — PDF and Excel report generation."""

import structlog

from app.workers.celery_app import celery_app

logger = structlog.get_logger(__name__)


@celery_app.task(name="app.workers.tasks.report_generation.generate_pdf_report")
def generate_pdf_report(assessment_id: str, user_id: str) -> str:
    """
    Generate a PDF assessment report and upload it to MinIO.
    Returns the object key of the generated file.
    Sprint 15 will implement the full WeasyPrint-based generation.
    """
    logger.info("pdf_report_queued", assessment_id=assessment_id, user_id=user_id)
    # TODO: implement WeasyPrint PDF generation in Sprint 15
    return f"reports/{assessment_id}/report.pdf"
