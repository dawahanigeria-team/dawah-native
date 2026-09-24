# Mobile Sentry and performance audit — 2026-09-18

Read-only Sentry audit: `prontoville/dawah-native`, production, `lastSeen:-14d`, sorted by most recent, paginated to completion (55 issues). Includes resolved issues with recent recurrence. Counts below are Sentry lifetime issue counts, not 14-day counts. Latest events can differ from the grouped issue title. No issues were resolved in Sentry and no release was deployed.

## Changes made in this pass

- Fixed self-deadlock when a deduplicated GET refreshes authentication and retries. Concurrent callers now share the final result, including rejection; real-client regression tests cover it.
- Moved network rate limiting after cache lookup so cached reads do not queue behind network traffic.
- Handled Google SDK cancellation as a normal result, retrieved missing ID tokens after successful sign-in, and prevented overlapping native sign-ins.
- Removed delayed entrance animations from Home, profile, auth and Ramadan browsing; removed lecture parallax and spring worklets; made stack navigation immediate. Shared buttons now use synchronous press feedback instead of per-card spring worklets.
- Restored FlashList v2 recycling by removing obsolete v1 AutoLayoutView checks, including the section screen. Artwork failure state is tied to its URL so reused rows do not inherit another item’s failure; behavior tested.
- Removed full-player subscriptions from album, reciter and playlist screens; progress ticks no longer trigger those screen renders.
- Removed eager Home prefetch of original artwork, which could duplicate resized card downloads and invoke native work for unseen images. Visible images retain caching.
- Classify only the structured download-limit 403 as a handled business outcome; retain other forbidden/server failures.

## Existing work preserved and verified

The working tree already contained audio initialization/restoration, downloads, protected-keychain, SQLite cache, skeleton, notification-navigation, Sentry replay and expo-audio native patch changes. Those were preserved; they are not all new changes from this pass. Existing native audio patches specifically match the currentDate and synchronous metadata hang stacks. They need compilation and device validation. No dependency upgrades or removals were added in this pass. Reanimated remains used by the interactive mini-player, so removing its package would break that feature.

## Validation and release requirements

- TypeScript: passed after correcting an existing test constructor invocation. ESLint: zero errors in the checked app and changed component/service files; pre-existing warnings remain.
- Tests: 60 suites / 305 tests passed. Jest detectOpenHandles identifies existing Sentry AsyncExpiringMap cleanup intervals in tests importing the real SDK; assertions passed and the command exited successfully; the SDK timers still warrant test isolation cleanup.
- Android, iOS and web production exports: passed; final export repeated after last edits. Final output: `/tmp/dn-mobile-performance-export-final`. Bundle export is not native compilation.
- No Android device connected and no iOS simulator booted. No before/after FPS, startup latency or native crash-free claim is made.
- Rebuild native binaries for the existing expo-audio patch and native dependency changes. App config is 1.2.0 with appVersion runtime policy; sampled production events are mostly 1.1.0 or older.
- On release devices test cold launch, rapid navigation, fast list scrolling, recycling after failed image loads, long audio playback, lock/unlock, repeated Google taps/cancellation, expired-token GET recovery, downloads and offline recovery. Compare p50/p95 time-to-interactive, slow/frozen frames, ANR/hang counts and crash-free sessions by release/device.
- Official references: [React Native release-mode performance](https://reactnative.dev/docs/performance), [FlashList recycling](https://shopify.github.io/flash-list/docs/recycling/), [FlashList v2 migration](https://shopify.github.io/flash-list/docs/v2-migration/), [Google configuration errors](https://react-native-google-signin.github.io/docs/troubleshooting).

## Issue disposition

| Issue | Latest seen (UTC) | Lifetime events | Disposition |
|---|---|---:|---|
| [DAWAH-NATIVE-27](https://prontoville.sentry.io/issues/7658113405/) | 2026-09-18T20:59:57Z | 276 | Existing auth refusal handling preserved. GET refresh self-deadlock fixed in this pass; verify session recovery and deployed release. Wrong-password refusals remain visible to users. |
| [DAWAH-NATIVE-42](https://prontoville.sentry.io/issues/7741052774/) | 2026-09-18T19:17:39Z | 1 | Native hang/ANR remains unverified. Reduced rendering/worklet load; existing replay suppression retained. A native device trace is needed to establish resolution. |
| [DAWAH-NATIVE-8](https://prontoville.sentry.io/issues/7431153847/) | 2026-09-18T18:33:42Z | 24 | Connectivity/timeout failure: cache scheduling improved and existing offline handling preserved. Network/server latency still needs production verification. |
| [DAWAH-NATIVE-18](https://prontoville.sentry.io/issues/7472130596/) | 2026-09-18T18:32:47Z | 38 | Overlapping native sign-in guarded; repeated-tap regression passes. |
| [DAWAH-NATIVE-17](https://prontoville.sentry.io/issues/7472130464/) | 2026-09-18T18:32:40Z | 40 | Overlapping native sign-in guarded; repeated-tap regression passes. |
| [DAWAH-NATIVE-2Q](https://prontoville.sentry.io/issues/7677846806/) | 2026-09-18T17:33:02Z | 45 | Google cancellation, fallback token retrieval and overlapping taps fixed; test on affected devices. |
| [DAWAH-NATIVE-3A](https://prontoville.sentry.io/issues/7699358614/) | 2026-09-18T13:16:00Z | 113 | Existing download finalization fix handles missing/stale .part files; regression suite passes. |
| [DAWAH-NATIVE-3S](https://prontoville.sentry.io/issues/7715185666/) | 2026-09-18T13:15:59Z | 100 | Latest event is DOWNLOAD_LIMIT_REACHED (not the issue title). Narrow handling added for that 403; quota remains enforced. |
| [DAWAH-NATIVE-3](https://prontoville.sentry.io/issues/7430535103/) | 2026-09-18T13:11:01Z | 325 | Google DEVELOPER_ERROR requires checking the Play signing certificate against Google OAuth configuration. Local package and web client ID match the bundled config; remote signing setup is unverified. |
| [DAWAH-NATIVE-J](https://prontoville.sentry.io/issues/7435430191/) | 2026-09-18T11:30:59Z | 744 | Existing auth refusal handling preserved. GET refresh self-deadlock fixed in this pass; verify session recovery and deployed release. Wrong-password refusals remain visible to users. |
| [DAWAH-NATIVE-S](https://prontoville.sentry.io/issues/7439286905/) | 2026-09-18T09:44:38Z | 56 | Removed Home entrance Animated.View usage; older installed releases still need an update. |
| [DAWAH-NATIVE-D](https://prontoville.sentry.io/issues/7434052545/) | 2026-09-18T09:44:38Z | 65 | Reanimated JS/native flag mismatch in old 1.0.0 release. Current runtimeVersion uses appVersion; native dependencies require a matching native build, not an OTA to old runtimes. |
| [DAWAH-NATIVE-3V](https://prontoville.sentry.io/issues/7717142333/) | 2026-09-18T09:15:39Z | 10 | Existing SecureStore change retries locked keychain reads after foreground; device validation required. |
| [DAWAH-NATIVE-1Y](https://prontoville.sentry.io/issues/7593211977/) | 2026-09-18T08:53:37Z | 338 | Existing auth refusal handling preserved. GET refresh self-deadlock fixed in this pass; verify session recovery and deployed release. Wrong-password refusals remain visible to users. |
| [DAWAH-NATIVE-2Z](https://prontoville.sentry.io/issues/7682342460/) | 2026-09-18T06:47:14Z | 47 | Failed player setup can retry, and closing no longer requires hook controls; tests pass. Starting playback still requires AudioProvider controls, so the early-initialization error is not proven resolved. |
| [DAWAH-NATIVE-2A](https://prontoville.sentry.io/issues/7662197734/) | 2026-09-18T05:44:15Z | 115 | Existing auth refusal handling preserved. GET refresh self-deadlock fixed in this pass; verify session recovery and deployed release. Wrong-password refusals remain visible to users. |
| [DAWAH-NATIVE-2R](https://prontoville.sentry.io/issues/7677958499/) | 2026-09-18T05:23:11Z | 56 | Existing lazy restoration/player setup and recovery fixes preserved; streaming availability and affected-device playback still need verification. |
| [DAWAH-NATIVE-2H](https://prontoville.sentry.io/issues/7670702066/) | 2026-09-18T01:19:19Z | 83 | Connectivity/timeout failure: cache scheduling improved and existing offline handling preserved. Network/server latency still needs production verification. |
| [DAWAH-NATIVE-33](https://prontoville.sentry.io/issues/7685352259/) | 2026-09-18T00:28:20Z | 30 | TLS verifies from this machine; affected Android trust store / served chain still needs device reproduction. Do not bypass TLS. |
| [DAWAH-NATIVE-2G](https://prontoville.sentry.io/issues/7669142129/) | 2026-09-17T20:48:45Z | 33 | Update/asset download failure remains dependent on network and release assets. Keep genuine failures observable; verify affected update and device. |
| [DAWAH-NATIVE-Y](https://prontoville.sentry.io/issues/7457416946/) | 2026-09-17T19:25:28Z | 5 | Google cancellation, fallback token retrieval and overlapping taps fixed; test on affected devices. |
| [DAWAH-NATIVE-K](https://prontoville.sentry.io/issues/7435449987/) | 2026-09-17T16:50:20Z | 277 | Existing lazy restoration/player setup and recovery fixes preserved; streaming availability and affected-device playback still need verification. |
| [DAWAH-NATIVE-7](https://prontoville.sentry.io/issues/7431033072/) | 2026-09-17T16:37:58Z | 151 | Existing lazy restoration/player setup and recovery fixes preserved; streaming availability and affected-device playback still need verification. |
| [DAWAH-NATIVE-2M](https://prontoville.sentry.io/issues/7673486288/) | 2026-09-17T15:37:11Z | 34 | Existing expo-audio native patch avoids currentDate for recorded audio; requires a new native build. |
| [DAWAH-NATIVE-2P](https://prontoville.sentry.io/issues/7677284368/) | 2026-09-17T11:37:19Z | 6 | Existing expo-audio native patch loads asset metadata asynchronously; requires a new native build. |
| [DAWAH-NATIVE-F](https://prontoville.sentry.io/issues/7434418349/) | 2026-09-17T07:27:00Z | 1491 | Existing auth refusal handling preserved. GET refresh self-deadlock fixed in this pass; verify session recovery and deployed release. Wrong-password refusals remain visible to users. |
| [DAWAH-NATIVE-N](https://prontoville.sentry.io/issues/7436246192/) | 2026-09-17T02:40:14Z | 117 | Current local Google web client ID is present and matches bundled config. Verify production EAS environment and affected historical builds. |
| [DAWAH-NATIVE-41](https://prontoville.sentry.io/issues/7736196660/) | 2026-09-16T17:37:23Z | 1 | Existing expo-audio native patch loads asset metadata asynchronously; requires a new native build. |
| [DAWAH-NATIVE-40](https://prontoville.sentry.io/issues/7735946906/) | 2026-09-16T15:28:08Z | 1 | Native hang/ANR remains unverified. Reduced rendering/worklet load; existing replay suppression retained. A native device trace is needed to establish resolution. |
| [DAWAH-NATIVE-2Y](https://prontoville.sentry.io/issues/7682247312/) | 2026-09-13T11:43:53Z | 6 | Removed lecture spring/parallax worklets and shared button springs; native recurrence verification required. |
| [DAWAH-NATIVE-2X](https://prontoville.sentry.io/issues/7682247299/) | 2026-09-13T11:43:53Z | 5 | Removed lecture spring/parallax worklets and shared button springs; native recurrence verification required. |
| [DAWAH-NATIVE-2](https://prontoville.sentry.io/issues/7427919472/) | 2026-09-13T10:24:19Z | 1099 | Existing auth refusal handling preserved. GET refresh self-deadlock fixed in this pass; verify session recovery and deployed release. Wrong-password refusals remain visible to users. |
| [DAWAH-NATIVE-32](https://prontoville.sentry.io/issues/7684433145/) | 2026-09-13T05:58:58Z | 28 | Connectivity/timeout failure: cache scheduling improved and existing offline handling preserved. Network/server latency still needs production verification. |
| [DAWAH-NATIVE-2E](https://prontoville.sentry.io/issues/7666406814/) | 2026-09-12T21:46:24Z | 4 | Native Swift/JSI lifetime crash remains unproven; requires symbolicated native reproduction and dependency fix. |
| [DAWAH-NATIVE-3Z](https://prontoville.sentry.io/issues/7728754058/) | 2026-09-12T19:25:53Z | 1 | Android touch pointerIndex crash remains; requires reproduction on affected native device/build. |
| [DAWAH-NATIVE-3Y](https://prontoville.sentry.io/issues/7723389944/) | 2026-09-12T17:34:22Z | 3 | Reported media URL returns HTTP 200 now; historical 404 is not currently reproducible. |
| [DAWAH-NATIVE-37](https://prontoville.sentry.io/issues/7693713544/) | 2026-09-12T17:27:39Z | 14 | Connectivity/timeout failure: cache scheduling improved and existing offline handling preserved. Network/server latency still needs production verification. |
| [DAWAH-NATIVE-35](https://prontoville.sentry.io/issues/7690104844/) | 2026-09-11T10:40:54Z | 3 | Update/asset download failure remains dependent on network and release assets. Keep genuine failures observable; verify affected update and device. |
| [DAWAH-NATIVE-2K](https://prontoville.sentry.io/issues/7671882482/) | 2026-09-11T07:14:15Z | 3 | Native ImageModule/JSI lifetime crash remains unproven. Removed eager Home image prefetch; this is mitigation, not proof of resolution. |
| [DAWAH-NATIVE-26](https://prontoville.sentry.io/issues/7655110716/) | 2026-09-11T02:20:12Z | 2 | Native hang/ANR remains unverified. Reduced rendering/worklet load; existing replay suppression retained. A native device trace is needed to establish resolution. |
| [DAWAH-NATIVE-T](https://prontoville.sentry.io/issues/7440867718/) | 2026-09-10T23:30:18Z | 40 | Connectivity/timeout failure: cache scheduling improved and existing offline handling preserved. Network/server latency still needs production verification. |
| [DAWAH-NATIVE-R](https://prontoville.sentry.io/issues/7437196191/) | 2026-09-10T20:05:05Z | 37 | Update/asset download failure remains dependent on network and release assets. Keep genuine failures observable; verify affected update and device. |
| [DAWAH-NATIVE-1V](https://prontoville.sentry.io/issues/7551128329/) | 2026-09-10T12:00:16Z | 21 | Native hang/ANR remains unverified. Reduced rendering/worklet load; existing replay suppression retained. A native device trace is needed to establish resolution. |
| [DAWAH-NATIVE-39](https://prontoville.sentry.io/issues/7695627048/) | 2026-09-10T11:23:13Z | 4 | Album 333769 returned no tracks. Content/API investigation remains; do not invent playable content. |
| [DAWAH-NATIVE-3X](https://prontoville.sentry.io/issues/7723368863/) | 2026-09-10T05:47:01Z | 1 | Existing cache clear changes avoid exclusive multiRemove transactions; device validation required. |
| [DAWAH-NATIVE-28](https://prontoville.sentry.io/issues/7661476074/) | 2026-09-09T22:33:19Z | 11 | Failed player setup can retry, and closing no longer requires hook controls; tests pass. Starting playback still requires AudioProvider controls, so the early-initialization error is not proven resolved. |
| [DAWAH-NATIVE-3W](https://prontoville.sentry.io/issues/7722760669/) | 2026-09-09T22:14:07Z | 1 | Native hang/ANR remains unverified. Reduced rendering/worklet load; existing replay suppression retained. A native device trace is needed to establish resolution. |
| [DAWAH-NATIVE-2S](https://prontoville.sentry.io/issues/7678109891/) | 2026-09-09T18:23:20Z | 8 | Connectivity/timeout failure: cache scheduling improved and existing offline handling preserved. Network/server latency still needs production verification. |
| [DAWAH-NATIVE-3Q](https://prontoville.sentry.io/issues/7711978841/) | 2026-09-09T05:48:11Z | 3 | Native hang/ANR remains unverified. Reduced rendering/worklet load; existing replay suppression retained. A native device trace is needed to establish resolution. |
| [DAWAH-NATIVE-C](https://prontoville.sentry.io/issues/7433994391/) | 2026-09-08T18:14:25Z | 244 | Existing lazy restoration/player setup and recovery fixes preserved; streaming availability and affected-device playback still need verification. |
| [DAWAH-NATIVE-B](https://prontoville.sentry.io/issues/7433764609/) | 2026-09-07T04:52:11Z | 3 | Google Play Services internal/network failure; retry on affected device. New overlap guard prevents concurrent native calls; infrastructure failures are not claimed fixed. |
| [DAWAH-NATIVE-5](https://prontoville.sentry.io/issues/7430554612/) | 2026-09-07T04:30:23Z | 6 | Google Play Services internal/network failure; retry on affected device. New overlap guard prevents concurrent native calls; infrastructure failures are not claimed fixed. |
| [DAWAH-NATIVE-M](https://prontoville.sentry.io/issues/7436122272/) | 2026-09-06T21:07:51Z | 34 | Existing SecureStore change retries locked keychain reads after foreground; device validation required. |
| [DAWAH-NATIVE-3T](https://prontoville.sentry.io/issues/7715273880/) | 2026-09-06T13:08:45Z | 1 | Native hang/ANR remains unverified. Reduced rendering/worklet load; existing replay suppression retained. A native device trace is needed to establish resolution. |
| [DAWAH-NATIVE-P](https://prontoville.sentry.io/issues/7436257421/) | 2026-09-05T14:23:00Z | 80 | Connectivity/timeout failure: cache scheduling improved and existing offline handling preserved. Network/server latency still needs production verification. |

## Notification Back replay follow-up

The previous root implementation recreated `safePush` on every pathname change. Its notification effect depended on that callback and reread the last native notification response on every route change. Back could therefore push the lecture again. The stable callback and once-mounted observer changes already in the working tree address that replay path.

This follow-up moves consumed response identities to bounded JS-session storage, so root remounts cannot replay a response while native cache clearing is pending or has failed. New notification identities still navigate. Root navigation now anchors cold-start deep links to `(tabs)`, and all lecture Back controls fall back to Home if no history exists. Normal in-app Back behavior is preserved.

Validation: 16 tests across notification observation, payload routing and Back fallback passed. Tests cover route rerenders, delayed duplicate responses beyond the old debounce window, native clear failure plus remount, warm-app duplicate delivery, newer live taps winning over stale initial reads, and late callbacks after unmount. TypeScript and checked-file ESLint passed. Physical-device notification delivery and Back remain release checks; this follow-up has not been deployed.

Final follow-up validation (2026-09-19): all 61 suites / 310 tests passed; Android, iOS and web production exports completed at `/tmp/dn-notification-export`. The existing Jest SDK-timer warning remains; the test command exited successfully. No release was deployed.


## Pre-ship review (2026-09-19)

Found and corrected a playback retry regression: `playEpisode` cleared `errorMessage` before deciding whether the same episode needed a fresh source. Both direct retry and the mini-player retry could resume a failed source. Two new regression cases failed before the change and passed afterward; all 14 player-store tests passed.

Configured `expo.autolinking.ios.buildFromSource` for `expo-audio` so fresh native builds cannot bypass the local Swift patch by using a precompiled module. Local Expo autolinking resolves this setting and the patched package path.

Release-device acceptance checks still required:

- On both Android and iOS, tap a lecturer notification with the app terminated, backgrounded and foregrounded. Back once must exit the lecture; navigating afterward must not reopen it. A later, distinct notification must still open.
- Start audio, force a network/source failure, restore connectivity and retry from the lecture and mini-player. Confirm recovery, queue behavior, lock-screen controls and background playback.
- Download and cancel a large recording; confirm finalization does not freeze scrolling and cancelled files do not appear as completed.
- In a release build on representative lower-end Android hardware, measure cold launch, Home/lecture interaction latency and scrolling while audio plays. No measured speedup or frame-rate target is claimed by the unit tests.
- Confirm Google sign-in using the actual Play-distributed signing certificate, then observe the new native release in Sentry before resolving affected production issues.

Do not release these native audio changes as an OTA-only fix to an older binary. No production release or Sentry resolution was performed during this review.

Pre-ship JavaScript verification: all 61 suites / 312 tests passed. The added fixture was then completed to satisfy the Episode type; all 14 player-store tests were rerun successfully. TypeScript and whole-project ESLint (quiet/error-only) passed. Git whitespace validation passed with CRLF handling. Native build results are recorded below when available.


## Native verification outcome (2026-09-20)

**Not cleared to ship.** The resumed local iOS Release simulator build and Android `assembleRelease` both failed with `No space left on device`. The filesystem reached approximately 287 MiB free. These are environment failures, not passing native builds; no conclusion about complete native compilation or runtime correctness is justified.

- iOS: failed writing RNSVG compiler dependency/diagnostic output; Xcode exit 65. Log: `/tmp/dn-native-ios-final.log`.
- Android: failed writing C++ output while building app modules for armeabi-v7a; Gradle exit 1. Log: `/tmp/dn-native-android-final.log`.
- Earlier interrupted build logs also have no successful completion marker.
- Removed only the approximately 3.7 GiB temporary iOS DerivedData directory created for this review (`/tmp/dn-release-review-ios`) to recover disk space; retained source changes and diagnostic logs.
- No Android device was attached, and no iOS simulator was booted. Notification/device performance smoke tests remain unperformed.

The source review and 312-test/TypeScript/ESLint results remain valid. Before shipping, complete native release builds on a machine with sufficient disk space, then perform the notification, playback and performance acceptance checks above. No release was published and no Sentry issue was marked resolved.


## Retry after disk cleanup (2026-09-20)

The user freed disk space; the retry started with approximately 40 GiB available. Android `:app:assembleRelease` completed successfully (exit 0, 12m 42s, 1157 actionable tasks). The local APK is `android/app/build/outputs/apk/release/app-release.apk` (approximately 121 MiB, all configured architectures). Log: `/tmp/dn-native-android-retry.log`. This validates local Release compilation/packaging; it is not a Play signing or physical-device validation. Sentry upload was disabled for the local build. iOS retry result follows below.


iOS retry also **passed** (`BUILD SUCCEEDED`, exit 0). This was an unsigned arm64 **Release simulator** build, not an App Store device archive. The build log confirms compilation of the patched `AudioPlayer.swift` and `MediaController.swift` sources. Artifact: `/tmp/dn-release-review-ios/Build/Products/Release-iphonesimulator/dawahnigeria.app`. Log: `/tmp/dn-native-ios-retry.log`.

The disk-space build blocker is now cleared: Android Release APK and iOS Release simulator compilation/packaging both succeeded. No source changes were needed for this retry. Existing 312-test, TypeScript and ESLint passes remain applicable. Physical-device notification Back behavior, playback recovery, signing/distribution configuration and measured performance remain release acceptance checks. No deployment or Sentry resolution was performed.


## Production Android AAB (2026-09-21)

EAS production build `920a3849-8e7c-4c65-bebf-1d4d437d6d45` completed successfully for **1.2.0 (version code 32)** using the existing remote Android production keystore. Source archive inspection verified the notification, playback and API fixes, dependency lockfiles and native audio patch. The archive's native folders were empty, so the old local generated native project was not uploaded as the production project.

Build: https://expo.dev/accounts/yusadolat/projects/dawah-nigeria/builds/920a3849-8e7c-4c65-bebf-1d4d437d6d45

Download: https://expo.dev/artifacts/eas/e3jzUtXo0Cl-v6DClQ7YWvN49_6F7d2LYtu_sSx6rQs.aab

Local artifact: `android/app/build/outputs/bundle/production-eas/dawahnigeria-1.2.0-32.aab` (90,406,208 bytes).

SHA-256: `a2c6cbbb9293b498128858e6abdb82a5bb5128dc4b81d6042252da8a98063d66`.

Validation: ZIP CRC/integrity passed; required bundle entries are present; jarsigner verified the signature; official bundletool 1.18.3 validation passed. The decoded manifest confirms `com.dawahnigeria.app`, version 1.2.0, code 32, and debuggable=false.

Jarsigner reported self-signed-certificate/no-timestamp and ZIP-entry-order/JarInputStream warnings; these logs are retained at `/tmp/dn-aab-signature-java17.log`. Android bundletool accepted the bundle without a validation error. The previous EAS production artifact URL returned 404, so its signing certificate could not be independently compared; no certificate-match claim is made.

The older local APK remains a compile-check artifact: its ignored native project used debug signing and version 1.0.1/code 2. Use this EAS AAB for Play testing. The AAB has not been submitted to Play, no OTA was published, and no Sentry issue was marked resolved. Device notification, playback and measured-performance checks remain required before production rollout. The iOS native audio patch still requires a separate iOS distribution build.
