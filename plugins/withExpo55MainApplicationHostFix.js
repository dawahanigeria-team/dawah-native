const fs = require("fs");
const path = require("path");
const { withDangerousMod, WarningAggregator } = require("expo/config-plugins");

const MAIN_APPLICATION_FILE = "MainApplication.kt";
const EXPO_IMPORT_OLD = "import expo.modules.ReactNativeHostWrapper";
const EXPO_IMPORT_NEW = "import expo.modules.ExpoReactHostFactory";

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

const withExpo55MainApplicationHostFix = (config) =>
  withDangerousMod(config, [
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

module.exports = withExpo55MainApplicationHostFix;
