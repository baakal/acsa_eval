"""Background task — email and in-app notification dispatch."""

import structlog

from app.workers.celery_app import celery_app

logger = structlog.get_logger(__name__)


@celery_app.task(name="app.workers.tasks.notification_dispatch.send_email")
def send_email(to: str, subject: str, html_body: str) -> None:
    """Send a transactional email. Sprint 17 will implement SMTP."""
    logger.info("email_queued", to=to, subject=subject)
    # TODO: implement aiosmtplib send in Sprint 17


@celery_app.task(name="app.workers.tasks.notification_dispatch.send_overdue_reminders")
def send_overdue_reminders() -> None:
    """Send reminders for overdue assessments and evidence requests. Runs hourly."""
    logger.info("overdue_reminders_check")
    # TODO: query overdue items and dispatch notifications in Sprint 17
