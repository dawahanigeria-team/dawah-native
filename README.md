# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Native Folders (android/ios)

**Important:** The `android/` and `ios/` folders are **not tracked** in git. They are auto-generated and can be regenerated anytime.

### Regenerating Native Folders

If you've just cloned this repository, you need to generate the native folders:

```bash
# For Android
npm run prebuild:android

# For iOS (macOS only)
expo prebuild --platform ios
```

### Why aren't they tracked?

- ✅ **Auto-Generated**: Created by `expo prebuild` - can be regenerated anytime
- ✅ **Cleaner Git History**: Avoids huge commits with thousands of native files
- ✅ **Fewer Merge Conflicts**: No conflicts in generated files
- ✅ **Smaller Repository**: Saves ~50MB+ in repo size
- ✅ **Expo Best Practice**: Recommended for CNG (Continuous Native Generation)

### Building for Development

```bash
# Build and run Android development build
npm run android

# Build and run iOS development build (macOS only)
npm run ios

# Build with EAS for testing on physical devices
npm run eas:dev:android  # Android
npm run eas:dev:ios      # iOS
```

### Building for Production

```bash
# Build Android APK (for direct installation)
npm run build:android:apk

# Build Android AAB (for Google Play Store)
npm run build:android:aab

# Build with EAS for production
npm run eas:prod:android  # Android AAB
npm run eas:prod:ios      # iOS IPA
```

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
