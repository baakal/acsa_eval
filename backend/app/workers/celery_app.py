"""Celery application — task queue for background jobs."""

from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "acsa_eval",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.workers.tasks.virus_scan",
        "app.workers.tasks.notification_dispatch",
        "app.workers.tasks.report_generation",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    # Queue routing
    task_routes={
        "app.workers.tasks.virus_scan.*": {"queue": "virus_scan"},
        "app.workers.tasks.notification_dispatch.*": {"queue": "notifications"},
        "app.workers.tasks.report_generation.*": {"queue": "reports"},
    },
    # Beat schedule for periodic tasks
    beat_schedule={
        "send-overdue-reminders": {
            "task": "app.workers.tasks.notification_dispatch.send_overdue_reminders",
            "schedule": 3600.0,  # every hour
        },
    },
)
