# SECTION 15 — OFFLINE AND CONNECTIVITY STRATEGY

### 15.1 MVP Offline Scope

| Capability | MVP |
|---|---|
| Browse cached questionnaire structure | ✓ |
| View previously loaded answers | ✓ |
| Enter and save answers without network | ✗ (future) |
| Upload evidence without network | ✗ (future) |
| Submit assessment without network | ✗ (never — requires server validation) |

### 15.2 Draft Response Caching (MVP)

- On every successful autosave, response written to encrypted SQLite.
- On reconnect, if local draft is newer than server, it is automatically submitted.
- If server version is newer, conflict dialog shown.
- Network status indicator in header.

### 15.3 Future Full Offline Mode

- All questionnaire data pre-fetched on assignment.
- All draft responses stored locally in encrypted SQLite.
- Sync queue with timestamps and version vectors.
- Evidence files staged locally, uploaded on reconnect with resumable upload.
- Local data encrypted at rest; wiped on logout and after configurable inactivity.

---
