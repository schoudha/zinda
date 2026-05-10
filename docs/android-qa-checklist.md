# Android Native QA Checklist

## Core Offline Flow

- Launch app with network disabled; dashboard loads cached/local state.
- Create, edit, and delete goals.
- Add notes, toggle checked state, delete notes.
- Update goal progress and completion counters.
- Create reminder settings and relaunch app; data persists.

## Android Integrations

- Usage stats permission denied and granted states are both handled.
- Health Connect unavailable, available-without-permission, and granted flows are handled.
- App blocking toggle updates shared state and service behavior.
- Call log permission denied path shows non-crashing fallback.

## Lifecycle / Stability

- Rotate device on each main screen and verify no data loss/crash.
- Background/foreground app multiple times and confirm state consistency.
- Cold start and warm start both open dashboard successfully.

## Release Gate

- `android:build` passes.
- `android:test` passes.
- Manual smoke test run on at least one physical device.
