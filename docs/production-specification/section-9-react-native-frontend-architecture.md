# SECTION 9 — REACT NATIVE FRONTEND ARCHITECTURE

> Component diagram for this container: [§25.4.3](section-25-c4-architecture-diagrams.md#2543-client-application-components).
> The autosave and offline sync collaboration is drawn in [§25.6.2](section-25-c4-architecture-diagrams.md#2562-response-autosave-with-optimistic-concurrency).

### 9.1 Technology Decisions

| Concern | Choice | Rationale |
|---|---|---|
| Language | TypeScript (strict) | Type safety, IDE support |
| Navigation | React Navigation v7 | Production standard, deep-link support |
| State management | Zustand | Lightweight, TypeScript-first |
| Server state | TanStack Query (React Query v5) | Caching, background refresh, optimistic updates |
| Forms | React Hook Form + Zod | Performance, schema-driven validation |
| API client | Axios with interceptors | Token refresh, request/response transforms |
| Token storage | `expo-secure-store` | iOS Keychain / Android Keystore |
| Offline storage | `expo-sqlite` with SQLCipher | Encrypted structured local storage |
| Localization | `i18next` + `react-i18next` + `expo-localization` | Pluralization, RTL ready |
| File upload | `expo-document-picker` + resumable upload to pre-signed URL | Large file support |
| UI components | React Native Paper (Material Design 3) | Accessible, themed, cross-platform |
| Charts | Victory Native | Cross-platform, animated |
| Error tracking | Sentry | Crash reporting |
| Testing | Jest + React Native Testing Library + Detox (E2E) | Standard stack |
| Build | EAS Build (Expo Application Services) | Managed builds, OTA updates |

### 9.2 Directory Structure

```
src/
├── app/
│   ├── App.tsx
│   └── providers/            # QueryClient, i18n, theme, navigation
├── navigation/
│   ├── PublicNavigator.tsx
│   ├── AuthenticatedNavigator.tsx
│   ├── AdminNavigator.tsx
│   ├── ReviewerNavigator.tsx
│   ├── linking.ts
│   └── types.ts
├── screens/
│   ├── auth/
│   ├── dashboard/
│   ├── assessment/
│   ├── questionnaire/
│   ├── evidence/
│   ├── review/
│   ├── results/
│   ├── analytics/
│   ├── admin/
│   └── settings/
├── features/
│   ├── auth/
│   ├── organizations/
│   ├── assessments/
│   ├── questionnaires/
│   ├── responses/
│   │   ├── hooks/
│   │   ├── store/            # Offline drafts (Zustand)
│   │   └── sync/             # Sync queue, conflict resolver
│   ├── evidence/
│   ├── reviews/
│   ├── adjudication/
│   ├── results/
│   ├── analytics/
│   ├── notifications/
│   └── settings/
├── components/
│   ├── ui/                   # Atoms: Button, Input, Badge
│   ├── forms/                # Form field wrappers
│   ├── charts/               # Score gauges, bar charts
│   ├── layouts/              # ScreenLayout, SplitLayout (tablet)
│   └── feedback/             # Toast, ErrorBoundary, EmptyState
├── hooks/
├── services/
├── api/
│   ├── client.ts             # Axios instance, interceptors
│   ├── endpoints.ts
│   └── types/
├── state/
├── storage/
│   ├── secureStorage.ts
│   ├── draftStorage.ts
│   └── db.ts
├── localization/
│   ├── i18n.ts
│   ├── en/
│   ├── fr/
│   └── pt/
├── validation/               # Zod schemas
├── permissions/              # Role-gate components and hooks
├── theme/
│   ├── tokens.ts
│   └── theme.ts
└── types/
```

### 9.3 Navigation Structure

```
RootNavigator
├── PublicStack (unauthenticated)
│   ├── LoginScreen           # OIDC redirect
│   ├── RegisterScreen
│   └── OAuthCallbackScreen
└── AuthenticatedStack
    ├── BottomTabNavigator
    │   ├── DashboardTab
    │   │   └── AssessmentDetailStack
    │   │       ├── AssessmentOverviewScreen
    │   │       ├── QuestionnaireNavigatorScreen
    │   │       ├── EvidenceScreen
    │   │       ├── TeamScreen
    │   │       ├── SubmissionScreen
    │   │       └── ResultsScreen
    │   ├── ReviewTab (Reviewer roles only)
    │   │   └── ReviewStack
    │   │       ├── ReviewerDashboardScreen
    │   │       ├── ReviewWorkScreen
    │   │       └── EvidenceRequestScreen
    │   ├── AnalyticsTab (Admin/Reviewer roles)
    │   ├── NotificationsTab
    │   └── MoreTab
    │       ├── ProfileScreen
    │       ├── OrganizationSettingsScreen
    │       ├── ManualsScreen
    │       └── AdminNavigator (Admin roles only)
    │           ├── UserManagementScreen
    │           ├── OrganizationManagementScreen
    │           ├── QuestionnaireBuilderScreen
    │           ├── ScoringConfigScreen
    │           ├── TranslationScreen
    │           └── AuditLogScreen
    └── ModalStack (overlays)
        ├── EvidenceUploadModal
        ├── EvidenceRequestModal
        └── ConfirmSubmissionModal
```

### 9.4 Offline Strategy

1. All in-progress responses stored in encrypted local SQLite.
2. Sync queue stores pending PATCH operations with timestamp, version, and retry count.
3. On reconnect, queue processed in chronological order.
4. If server returns 409 (version conflict), conflict resolver offers: Keep local / Keep server / Merge (side-by-side diff).
5. Questionnaire structure cached in SQLite for offline reading.
6. Evidence files cached locally until upload confirmed by server.
7. Network status indicator in header: "Connected" / "Offline — changes will sync when reconnected".

---
