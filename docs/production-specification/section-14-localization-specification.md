# SECTION 14 — LOCALIZATION SPECIFICATION

### 14.1 Initial Languages

| Code | Language | Status |
|---|---|---|
| `en` | English | Primary (fallback) |
| `fr` | French | Required at production launch |
| `pt` | Portuguese | Required at production launch |

### 14.2 Translation Architecture

- **Static UI strings**: i18next JSON files by namespace (`common`, `auth`, `assessment`, `review`, `admin`, `errors`). Missing translations fall back to English.
- **Dynamic questionnaire content**: Stored in `*_translations` tables. API returns content for user's preferred language, falling back to English.
- **Notification templates**: Stored per language in `notification_templates`.
- **Error messages**: Error codes returned from API; translated client-side.
- **Date/number formatting**: `Intl.DateTimeFormat` and `Intl.NumberFormat` with user's locale.

### 14.3 Translation Workflow

1. New questionnaire version created in English.
2. Translation Administrator exports untranslated strings as XLIFF.
3. Translators return XLIFF. System marks strings translated.
4. Translation review by bilingual reviewer within the platform.
5. Version not publishable until all required languages are 100% translated.

### 14.4 Future RTL Support (Arabic)

- Design token `$text-direction: ltr | rtl` on all layout components.
- Logical CSS properties throughout (`margin-inline-start` not `margin-left`).
- React Navigation supports RTL via `I18nManager.isRTL`.
- Adding Arabic requires: language record, translations, `is_rtl=true`.

---
