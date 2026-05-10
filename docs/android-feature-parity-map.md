# Android Native Feature Parity Map

This map defines what the native Android app includes for v1 (MVP + Android integrations) and what is intentionally deferred.

## Screen Mapping

| Current Web Surface | Native Screen | v1 Status | Notes |
|---|---|---|---|
| `app/page.tsx` + `components/home-client.tsx` | `DashboardScreen` | Included | Single entry hub with core cards and quick actions. |
| `app/goals/[id]/page.tsx` | `GoalDetailScreen` | Included | Goal details, progress, completion increments, reminders. |
| Goal creation dialog | `GoalsScreen` + create action | Included | Local creation/edit/delete only. |
| `components/dashboard/notepad.tsx` | `NotesScreen` | Included | Local note list, create, toggle, delete. |
| `app/wellbeing/page.tsx` | `WellbeingPlaceholder` | Included (basic) | Local placeholder state, no cloud AI responses. |
| `app/health/chat/page.tsx` | `WellbeingPlaceholder` | Included (basic) | No server chat in v1. |
| Finance/Plaid components | None | Deferred | Cloud integration intentionally removed from v1. |

## Android Capability Mapping

| Existing Capability | Native Service Layer | v1 Status | Notes |
|---|---|---|---|
| `UsageStatsPlugin.kt` | `UsageStatsService` | Included | Foreground usage + permission status. |
| `HealthConnectPlugin.kt` | `HealthConnectService` | Included | Availability, permissions, weekly exercise minutes. |
| `AppBlockingPlugin.kt` + `AppBlockingService.kt` | `AppBlockingManager` + `AppBlockingService` | Included | Local blocking state + accessibility workflow. |
| `CallLogPlugin.kt` | `CallLogService` | Included | Permission + filtered call history. |

## Data Model Mapping

| Web Type (`types/index.ts`) | Native Domain Model | Local Storage |
|---|---|---|
| `Goal` | `Goal` | Room (`goals` table) |
| `Note` | `Note` | Room (`notes` table) |
| progress/completions in storage | `ProgressEntry`, `CompletionEntry` | Room (`progress_entries`, `completion_entries`) |
| `Thought` | `Thought` | Room (`thoughts` table) |
| notification fields on goal | `Reminder` | Room (`reminders` table) |

## Explicitly Out for v1

- Next.js routes and server APIs under `app/api/`.
- Hosted Vercel runtime and any web-view dependency.
- Supabase/Plaid/cloud calls.
- AI chat backends and URL summarization endpoints.
