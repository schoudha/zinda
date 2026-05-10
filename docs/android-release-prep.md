# Android Release Prep

## Build Variants

- `debug`: default developer build.
- `release`: minify disabled for migration phase.

## Signing (required before store upload)

1. Create a keystore and keep it outside version control.
2. Add signing values through secure local Gradle properties.
3. Configure release signing in `android/app/build.gradle`.

## Store Readiness

- Finalize app icon, screenshots, and privacy policy URL.
- Verify all permissions requested are justified in Play listing.
- Complete policy declarations for call log and usage stats access.
