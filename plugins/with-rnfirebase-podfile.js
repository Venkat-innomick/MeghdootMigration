const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const RNFIREBASE_FLAG = "$RNFirebaseAsStaticFramework = true";

const FIREBASE_PODS = [
  "Firebase",
  "FirebaseCore",
  "FirebaseCoreExtension",
  "FirebaseCoreInternal",
  "FirebaseInstallations",
  "FirebaseMessaging",
  "GoogleUtilities",
  "GoogleDataTransport",
  "nanopb",
];

const NOTIFEE_MAVEN_REPO =
  "    maven { url \"$rootDir/../node_modules/@notifee/react-native/android/libs\" }";
const NOTIFICATION_ICON_SOURCE =
  "assets/images/ic_notification_meghdoot_small.png";

const podLine = (name) => `  pod '${name}', :modular_headers => true`;

const applyPodfilePatch = (contents) => {
  let next = contents;

  if (!next.includes(RNFIREBASE_FLAG)) {
    next = next.replace(
      "prepare_react_native_project!",
      `prepare_react_native_project!\n${RNFIREBASE_FLAG}`,
    );
  }

  const podsBlock = FIREBASE_PODS.map(podLine).join("\n");
  if (!FIREBASE_PODS.every((pod) => next.includes(podLine(pod)))) {
    next = next.replace(
      "  config = use_native_modules!(config_command)",
      `  config = use_native_modules!(config_command)\n\n${podsBlock}`,
    );
  }

  return next;
};

const applyAppDelegatePatch = (contents) => {
  let next = contents;

  if (!next.includes("import FirebaseCore")) {
    next = next.replace("import Expo", "import Expo\nimport FirebaseCore");
  }

  if (!next.includes("FirebaseApp.configure()")) {
    next = next.replace(
      "    bindReactNativeFactory(factory)\n",
      "    bindReactNativeFactory(factory)\n\n    if FirebaseApp.app() == nil {\n      FirebaseApp.configure()\n    }\n",
    );
  }

  return next;
};

const applyAndroidBuildGradlePatch = (contents) => {
  let next = contents;

  if (!next.includes(NOTIFEE_MAVEN_REPO)) {
    next = next.replace(
      "    mavenCentral()\n    maven { url 'https://www.jitpack.io' }",
      `    mavenCentral()\n    maven { url 'https://www.jitpack.io' }\n${NOTIFEE_MAVEN_REPO}`,
    );
  }

  return next;
};

const copyIfExists = async (sourcePath, destinationPath) => {
  if (!fs.existsSync(sourcePath)) {
    return;
  }

  await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });
  await fs.promises.copyFile(sourcePath, destinationPath);
};

module.exports = function withRNFirebasePodfile(config) {
  config = withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, "Podfile");
      const original = await fs.promises.readFile(podfilePath, "utf8");
      const patched = applyPodfilePatch(original);

      if (patched !== original) {
        await fs.promises.writeFile(podfilePath, patched);
      }

      return config;
    },
  ]);

  config = withDangerousMod(config, [
    "ios",
    async (config) => {
      const appDelegatePath = path.join(
        config.modRequest.platformProjectRoot,
        config.ios?.name || "MEGHDOOT",
        "AppDelegate.swift",
      );

      if (!fs.existsSync(appDelegatePath)) {
        return config;
      }

      const original = await fs.promises.readFile(appDelegatePath, "utf8");
      const patched = applyAppDelegatePatch(original);

      if (patched !== original) {
        await fs.promises.writeFile(appDelegatePath, patched);
      }

      return config;
    },
  ]);

  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidRoot = config.modRequest.platformProjectRoot;
      const buildGradlePath = path.join(androidRoot, "build.gradle");

      if (!fs.existsSync(buildGradlePath)) {
        return config;
      }

      const original = await fs.promises.readFile(buildGradlePath, "utf8");
      const patched = applyAndroidBuildGradlePatch(original);

      if (patched !== original) {
        await fs.promises.writeFile(buildGradlePath, patched);
      }

      await copyIfExists(
        path.join(projectRoot, NOTIFICATION_ICON_SOURCE),
        path.join(
          androidRoot,
          "app",
          "src",
          "main",
          "res",
          "drawable",
          "ic_notification.png",
        ),
      );

      return config;
    },
  ]);

  return config;
};
