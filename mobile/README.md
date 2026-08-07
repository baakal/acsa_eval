# ACSA Mobile — React Native (Expo)

This is the Sprint 5 scaffold for the ACSA Self-Evaluation Portal mobile/web app.

## Prerequisites

- Node.js 20+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)

## Setup

```bash
make mobile-install    # installs npm dependencies
make mobile-start      # starts Expo dev server (iOS, Android, Web)
make mobile-web        # starts web-only (faster for dev)
```

## Project Structure (planned)

```
mobile/
├── app/                   # Expo Router — file-based routing
│   ├── (auth)/            # Login, Register screens
│   ├── (tabs)/            # Dashboard, Assessments, Notifications
│   │   ├── dashboard/
│   │   ├── assessments/
│   │   └── notifications/
│   ├── assessment/[id]/   # Assessment detail + section nav
│   ├── reviewer/          # Reviewer work queue (Sprint 12)
│   └── admin/             # Admin panel (Sprint 19)
├── components/
│   ├── auth/              # LoginForm, RegistrationForm
│   ├── assessment/        # RequirementCard, SectionNav, ProgressRing
│   ├── evidence/          # FileUpload, EvidenceList
│   └── ui/                # Button, Input, Badge, Modal, Card
├── hooks/                 # Custom React hooks
├── services/              # API client (axios), auth (PKCE)
├── i18n/                  # react-i18next config + translation files
│   ├── en.json
│   ├── fr.json
│   └── pt.json
├── theme/                 # Design tokens (colors, typography, spacing)
└── constants/             # App-wide constants
```

## Authentication

Login uses **PKCE authorization code flow** against Keycloak.
The `acsa-mobile` client in Keycloak is configured as a public client with
`pkce.code.challenge.method = S256`.

## API

All API calls go through `services/api.ts` which:
- Attaches the `Authorization: ****** header
- Handles 401 → triggers token refresh
- Uses the `EXPO_PUBLIC_API_URL` environment variable

## i18n

Supported languages: **English (en)**, **French (fr)**, **Portuguese (pt)**.
Language is stored in user preferences (synced from backend `users.preferred_lang`).

## Running tests

```bash
cd mobile && npm test
```

---

> **Sprint 5 status**: This is a scaffold README.
> The full Expo project will be bootstrapped with `npx create-expo-app` in Sprint 5.
