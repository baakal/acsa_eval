# SECTION 16 — FILE AND OBJECT STORAGE SPECIFICATION

> Sequence diagram of the full upload and scanning flow, including the quarantine branch and its
> effect on submission validation: [§25.6.1](section-25-c4-architecture-diagrams.md#2561-evidence-upload-and-malware-scanning).

### 16.1 Upload Architecture

```
Client → GET /evidence/upload-url → FastAPI → return pre-signed PUT URL
Client → PUT file directly to MinIO/S3 (pre-signed URL)
Client → POST /evidence/confirm {object_key, sha256} → FastAPI
FastAPI → verify file in storage, compute checksum
FastAPI → create file_objects record (status=PENDING_SCAN)
FastAPI → dispatch virus_scan Celery task
Celery  → download file, scan with ClamAV
Celery  → update scan_status = CLEAN | QUARANTINED
Celery  → notify uploader of result
```

### 16.2 Storage Configuration

| Setting | Value |
|---|---|
| Development | MinIO (`docker compose up minio`) |
| Production | AWS S3, Azure Blob, or GCS (S3-compatible API) |
| Bucket structure | `{env}-acsa-evidence/{organization_id}/{assessment_id}/{uuid}/{filename}` |
| Pre-signed upload URL TTL | 15 minutes |
| Pre-signed download URL TTL | 15 minutes |
| Default max file size | 50 MB (configurable in `system_settings`) |
| Allowed types (default) | PDF, DOCX, XLSX, PPTX, PNG, JPG, GIF, MP4, MOV, ZIP |
| Encryption at rest | AES-256 (SSE-S3 or SSE-KMS) |
| Access | Private bucket; all access via pre-signed URLs only |
| Lifecycle policy | Cold storage after 2 years; delete after 7 years (configurable) |

### 16.3 Confidentiality Classification

| Level | Accessible by |
|---|---|
| `STANDARD` | All assessment members + all reviewers |
| `RESTRICTED` | Assessment Manager + Reviewers + Adjudicators + Approvers |
| `CONFIDENTIAL` | Reviewers + Adjudicators + Approvers + ACSA Admins only |

---
