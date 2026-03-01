const fs = require("fs");
const path = require("path");
const { withAndroidManifest, withAppBuildGradle, withDangerousMod } = require("@expo/config-plugins");

/** Add silverguard:// deep link intent-filter to MainActivity */
function withSchemeIntentFilter(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const app = manifest.manifest;
    const activities = app.application?.[0]?.activity ?? [];
    const mainActivity = activities.find(
      (a) =>
        a.$?.["android:name"] === ".MainActivity" ||
        a.$?.["android:name"] === "com.silverguard.app.MainActivity"
    );
    if (!mainActivity) return config;

    const schemeFilter = {
      action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
      category: [
        { $: { "android:name": "android.intent.category.DEFAULT" } },
        { $: { "android:name": "android.intent.category.BROWSABLE" } },
      ],
      data: [
        {
          $: {
            "android:scheme": "silverguard",
            "android:host": "*",
            "android:pathPrefix": "/",
          },
        },
      ],
    };
    if (!mainActivity["intent-filter"]) mainActivity["intent-filter"] = [];
    const hasScheme = mainActivity["intent-filter"].some(
      (f) => f.data?.some((d) => d.$?.["android:scheme"] === "silverguard")
    );
    if (!hasScheme) {
      mainActivity["intent-filter"].push(schemeFilter);
    }
    return config;
  });
}

/** Add SmsReceiver and permissions to AndroidManifest */
function withSmsReceiverManifest(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    const app = manifest.manifest;

    // Add RECEIVE_SMS, READ_SMS if not present
    if (!app["uses-permission"]) app["uses-permission"] = [];
    const perms = app["uses-permission"];
    const addPerm = (name) => {
      if (!perms.some((p) => p.$?.["android:name"] === name)) {
        perms.push({ $: { "android:name": name } });
      }
    };
    addPerm("android.permission.RECEIVE_SMS");
    addPerm("android.permission.READ_SMS");
    addPerm("android.permission.POST_NOTIFICATIONS");

    // Add receiver inside <application>
    if (!app.application?.[0]?.["receiver"]) {
      app.application[0]["receiver"] = [];
    }
    const receivers = app.application[0]["receiver"];
    const existing = receivers.find(
      (r) => r.$?.["android:name"] === "com.silverguard.app.SmsReceiver"
    );
    const receiverWithPriority = {
      $: {
        "android:name": "com.silverguard.app.SmsReceiver",
        "android:exported": "true",
      },
      "intent-filter": [
        {
          $: { "android:priority": "999" },
          action: [
            { $: { "android:name": "android.provider.Telephony.SMS_RECEIVED" } },
          ],
        },
      ],
    };
    if (!existing) {
      receivers.push(receiverWithPriority);
    } else if (existing["intent-filter"]?.[0]?.$?.["android:priority"] !== "999") {
      Object.assign(existing, receiverWithPriority);
    }

    return config;
  });
}

/** Add WorkManager dependency and pickFirst for libexpo-gl.so to app build.gradle */
function withWorkManager(config) {
  return withAppBuildGradle(config, (config) => {
    let gradle = config.modResults.contents;
    if (!gradle.includes("work-runtime")) {
      const depMatch = gradle.match(/(dependencies\s*\{)/);
      if (depMatch) {
        gradle = gradle.replace(
          depMatch[1],
          `${depMatch[1]}
    implementation "androidx.work:work-runtime-ktx:2.9.0"`
        );
      }
    }
    if (!gradle.includes("libexpo-gl.so")) {
      gradle = gradle.replace(
        /(jniLibs \{\s*def enableLegacyPackaging[^}]+\}\s*)(\n    \})/,
        "$1\n        pickFirst '**/libexpo-gl.so'$2"
      );
    }
    config.modResults.contents = gradle;
    return config;
  });
}

/** Read BASE_DETECTOR_URL from constants/config.ts */
function getDetectorUrl(projectRoot) {
  const configPath = path.join(projectRoot, "constants", "config.ts");
  if (!fs.existsSync(configPath)) return null;
  const content = fs.readFileSync(configPath, "utf8");
  const match = content.match(/BASE_DETECTOR_URL\s*=\s*["']([^"']+)["']/);
  return match ? match[1] : null;
}

/** Copy Kotlin source files into the Android project, injecting BASE_DETECTOR_URL */
function withCopySmsSources(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const srcDir = path.join(projectRoot, "native-modules", "sms-receiver");
      const destDir = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "java",
        "com",
        "silverguard",
        "app"
      );

      if (!fs.existsSync(srcDir)) return config;

      const detectorUrl = getDetectorUrl(projectRoot);

      fs.mkdirSync(destDir, { recursive: true });
      for (const f of ["SmsReceiver.kt", "SmsAnalysisWorker.kt", "NotificationHelper.kt", "SmsContentObserver.kt"]) {
        const src = path.join(srcDir, f);
        const dest = path.join(destDir, f);
        if (fs.existsSync(src)) {
          let content = fs.readFileSync(src, "utf8");
          if (f === "SmsAnalysisWorker.kt" && detectorUrl) {
            content = content.replace(
              /private const val BASE_URL = "[^"]*"/,
              `private const val BASE_URL = "${detectorUrl.replace(/"/g, '\\"')}"`
            );
          }
          fs.writeFileSync(dest, content);
        }
      }

      // Register SmsContentObserver in MainApplication (fallback when SMS_RECEIVED not delivered)
      const mainAppFullPath = path.join(config.modRequest.platformProjectRoot, "app", "src", "main", "java", "com", "silverguard", "app", "MainApplication.kt");
      if (fs.existsSync(mainAppFullPath)) {
        let mainApp = fs.readFileSync(mainAppFullPath, "utf8");
        if (!mainApp.includes("SmsContentObserver")) {
          if (!mainApp.includes("import android.provider.Telephony")) {
            mainApp = mainApp.replace(
              /(import android.app.Application)/,
              "$1\nimport android.provider.Telephony"
            );
          }
          if (!mainApp.includes("import com.silverguard.app.SmsContentObserver")) {
            mainApp = mainApp.replace(
              /(import expo.modules.ApplicationLifecycleDispatcher)/,
              "import com.silverguard.app.SmsContentObserver\n$1"
            );
          }
          mainApp = mainApp.replace(
            /(ApplicationLifecycleDispatcher\.onApplicationCreate\(this\))/,
            "$1\n    val smsObserver = SmsContentObserver(this)\n    contentResolver.registerContentObserver(Telephony.Sms.CONTENT_URI, true, smsObserver)"
          );
          fs.writeFileSync(mainAppFullPath, mainApp);
        }
      }

      return config;
    },
  ]);
}

module.exports = function withSmsReceiver(config) {
  config = withSmsReceiverManifest(config);
  config = withSchemeIntentFilter(config);
  config = withWorkManager(config);
  config = withCopySmsSources(config);
  return config;
};
