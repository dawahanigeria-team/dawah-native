const fs = require("fs");
const path = require("path");
const { withDangerousMod, WarningAggregator } = require("expo/config-plugins");

const MAIN_APPLICATION_FILE = "MainApplication.kt";
const APP_DELEGATE_FILE = "AppDelegate.swift";
const EXPO_IMPORT_OLD = "import expo.modules.ReactNativeHostWrapper";
const EXPO_IMPORT_NEW = "import expo.modules.ExpoReactHostFactory";
const EXPO_IOS_IMPORT_OLD = "import Expo";
const EXPO_IOS_IMPORT_NEW = "internal import Expo";

const HOST_BLOCK = `  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              // add(MyReactNativePackage())
            }

        override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      }

  override val reactHost: ReactHost
    get() = ExpoReactHostFactory.getDefaultReactHost(
        context = applicationContext,
        packageList = PackageList(this).packages,
        jsMainModulePath = ".expo/.virtual-metro-entry",
        useDevSupport = BuildConfig.DEBUG
    )

`;

function findMainApplicationPath(androidProjectRoot, androidPackage) {
  if (androidPackage) {
    const expected = path.join(
      androidProjectRoot,
      "app",
      "src",
      "main",
      "java",
      ...androidPackage.split("."),
      MAIN_APPLICATION_FILE
    );

    if (fs.existsSync(expected)) {
      return expected;
    }
  }

  const javaRoot = path.join(androidProjectRoot, "app", "src", "main", "java");
  if (!fs.existsSync(javaRoot)) {
    return null;
  }

  const stack = [javaRoot];
  while (stack.length > 0) {
    const dir = stack.pop();
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name === MAIN_APPLICATION_FILE) {
        return fullPath;
      }
    }
  }

  return null;
}

function findFileRecursive(rootDir, fileName, excludedDirs = new Set()) {
  if (!fs.existsSync(rootDir)) {
    return null;
  }

  const stack = [rootDir];
  while (stack.length > 0) {
    const dir = stack.pop();
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!excludedDirs.has(entry.name)) {
          stack.push(fullPath);
        }
        continue;
      }

      if (entry.isFile() && entry.name === fileName) {
        return fullPath;
      }
    }
  }

  return null;
}

function applyExpo55HostFix(contents) {
  let updated = contents;

  if (updated.includes(EXPO_IMPORT_OLD)) {
    updated = updated.replace(EXPO_IMPORT_OLD, EXPO_IMPORT_NEW);
  } else if (!updated.includes(EXPO_IMPORT_NEW) && updated.includes("import expo.modules.ApplicationLifecycleDispatcher")) {
    updated = updated.replace(
      "import expo.modules.ApplicationLifecycleDispatcher",
      `import expo.modules.ApplicationLifecycleDispatcher\n${EXPO_IMPORT_NEW}`
    );
  }

  const hostSectionRegex =
    /  override val reactNativeHost: ReactNativeHost[\s\S]*?^  override fun onCreate\(\)/m;
  if (hostSectionRegex.test(updated)) {
    updated = updated.replace(
      hostSectionRegex,
      `${HOST_BLOCK}  override fun onCreate()`
    );
  }

  return updated;
}

function applyIosExpoImportFix(contents) {
  let updated = contents;

  if (!updated.includes(EXPO_IOS_IMPORT_NEW)) {
    updated = updated.replace(EXPO_IOS_IMPORT_OLD, EXPO_IOS_IMPORT_NEW);
  }

  updated = updated.replace(
    /public class AppDelegate: ExpoAppDelegate/g,
    "class AppDelegate: ExpoAppDelegate"
  );

  updated = updated.replace(
    /public override func application\(/g,
    "override func application("
  );

  updated = updated.replace(
    /^[ \t]*bindReactNativeFactory\(factory\)\n/m,
    ""
  );

  return updated;
}

const withExpo55MainApplicationHostFix = (config) => {
  const withAndroidFix = withDangerousMod(config, [
    "android",
    async (cfg) => {
      const androidProjectRoot = cfg.modRequest.platformProjectRoot;
      const mainApplicationPath = findMainApplicationPath(
        androidProjectRoot,
        cfg.android?.package
      );

      if (!mainApplicationPath) {
        WarningAggregator.addWarningAndroid(
          "withExpo55MainApplicationHostFix",
          "MainApplication.kt was not found; host fix was skipped."
        );
        return cfg;
      }

      const original = fs.readFileSync(mainApplicationPath, "utf8");
      const updated = applyExpo55HostFix(original);

      if (updated !== original) {
        fs.writeFileSync(mainApplicationPath, updated);
      }

      return cfg;
    },
  ]);

  return withDangerousMod(withAndroidFix, [
    "ios",
    async (cfg) => {
      const iosProjectRoot = cfg.modRequest.platformProjectRoot;
      const appDelegatePath = findFileRecursive(
        iosProjectRoot,
        APP_DELEGATE_FILE,
        new Set(["Pods", ".symlinks"])
      );

      if (!appDelegatePath) {
        WarningAggregator.addWarningIOS(
          "withExpo55MainApplicationHostFix",
          "AppDelegate.swift was not found; iOS Expo import fix was skipped."
        );
        return cfg;
      }

      const original = fs.readFileSync(appDelegatePath, "utf8");
      const updated = applyIosExpoImportFix(original);

      if (updated !== original) {
        fs.writeFileSync(appDelegatePath, updated);
      }

      return cfg;
    },
  ]);
};

module.exports = withExpo55MainApplicationHostFix;
