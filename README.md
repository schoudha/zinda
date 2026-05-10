This repository is now a local-first Android native app built with Kotlin, Jetpack Compose, and Room.

## Android Setup

1. Install Android Studio. **Use JDK 17 or newer** for Gradle/AGP 8.x (the build fails on Java 13). Point `JAVA_HOME` to that JDK, or use Android Studio’s bundled JBR via **Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK**.
2. Open the `android/` project in Android Studio.
3. Build and run the `app` module on an emulator or physical device.

## CLI Commands

```bash
npm run android:build
npm run android:test
npm run android:lint
```

## Architecture

- UI: Jetpack Compose with a bottom bar: **Faith**, **Knowledge**, **Exercise**, **Family** (placeholder content per tab for now).
- Older data/platform packages may still exist under `android/app/.../data` and `platform` for future wiring; the current shell does not depend on them.

## Migration Notes

- Legacy Next.js and API route files remain in the repository during migration, but are no longer part of the primary runtime.
- Capacitor web runtime is deprecated.
- Cloud integrations (Supabase/Plaid/Vercel) are out of scope for the native v1.

