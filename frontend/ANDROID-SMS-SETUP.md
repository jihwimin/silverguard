# Android SMS Monitoring — Setup Guide

## Architecture

```
SMS arrives → SmsReceiver (broadcast) OR SmsContentObserver (ContentProvider fallback)
  → WorkManager enqueues → SmsAnalysisWorker → POST /predict to backend
  → if probability ≥ 70% → Notification
```

**Important:** On Android 4.4+, only the default SMS app reliably receives the `SMS_RECEIVED` broadcast. SilverGuard uses **SmsContentObserver** as a fallback: when the default app (e.g. Google Messages) writes a new SMS to the provider, we detect it. This fallback only works while the app process is running — **launch SilverGuard at least once** before testing so it can observe new messages.

## Prerequisites

- Android device or emulator (SMS monitoring is Android-only)
- Backend running and reachable (e.g. via dev tunnel)
- Expo development build (not Expo Go — native code required)

## Setup Steps

### 1. Install dependencies

```bash
cd frontend
npm install expo-build-properties --legacy-peer-deps
```

### 2. Generate native Android project

```bash
npx expo prebuild --platform android --clean
```

This creates the `android/` folder and runs the config plugin, which:
- Adds `SmsReceiver`, `SmsAnalysisWorker`, `SmsContentObserver`, `NotificationHelper` Kotlin files
- Registers the BroadcastReceiver in AndroidManifest and SmsContentObserver in MainApplication
- Adds WorkManager and SMS permissions

### 3. Update backend URL (if needed)

Set **`constants/config.ts`** → `BASE_DETECTOR_URL` to your backend URL (e.g. dev tunnel). The plugin injects this into `SmsAnalysisWorker` during prebuild. After changing it, run `npx expo prebuild --platform android --clean` and rebuild.

### 4. Build and run

```bash
npx expo run:android
```

Or build a release APK:

```bash
cd android && ./gradlew assembleRelease
```

### 5. Grant permissions

On first launch (or in Settings → Apps → SilverGuard):
- Allow **SMS** (RECEIVE_SMS, READ_SMS)
- Allow **Notifications** (POST_NOTIFICATIONS on Android 13+)

## How it works

| Component | Role |
|-----------|------|
| **SmsReceiver** | Receives `SMS_RECEIVED` broadcast (may not fire when another app is default SMS app) |
| **SmsContentObserver** | Fallback: observes SMS ContentProvider for new inbox messages when app is running |
| **SmsAnalysisWorker** | Calls `POST /predict` with SMS text, parses `percent`; if ≥ 70%, shows notification |
| **NotificationHelper** | Shows system notification: "⚠️ Possible phishing detected (X%)" with message preview |

## Testing

1. Ensure backend is running and tunnel is active.
2. Send an SMS to the device (or use emulator's extended controls to simulate SMS).
3. If the message scores ≥ 70% phishing probability, a notification should appear.

## Troubleshooting

- **No notification:** (1) Ensure backend is running and reachable — emulator needs a public URL (dev tunnel), not localhost. (2) Update `constants/config.ts` → `BASE_DETECTOR_URL` to your current dev tunnel URL, then `npx expo prebuild --platform android --clean` and rebuild. (3) Grant notification permission when the app prompts (Android 13+). (4) **Launch SilverGuard and keep it in recents** — the ContentObserver fallback only works while the app process is running. (5) Check logcat: `adb logcat | grep -E "SmsReceiver|SmsContentObserver|SmsAnalysisWorker"`.
- **SMS not received:** Verify RECEIVE_SMS and READ_SMS are granted. If Google Messages is the default SMS app, SmsReceiver may not get the broadcast; SmsContentObserver will detect new SMS when SilverGuard is running.
- **Build errors:** Run `npx expo prebuild --platform android --clean` again.
- **Kotlin/WorkManager errors:** Ensure `android/app/build.gradle` includes `work-runtime-ktx` (the plugin adds it).

## Files

| Path | Purpose |
|------|---------|
| `native-modules/sms-receiver/SmsReceiver.kt` | BroadcastReceiver for SMS (may not fire when non-default SMS app) |
| `native-modules/sms-receiver/SmsContentObserver.kt` | ContentObserver fallback for new inbox SMS |
| `native-modules/sms-receiver/SmsAnalysisWorker.kt` | WorkManager worker, calls /predict |
| `native-modules/sms-receiver/NotificationHelper.kt` | Shows phishing alert notification |
| `plugins/withSmsReceiver.js` | Expo config plugin (manifest, gradle, copy sources) |
