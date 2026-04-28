import type { ExpoConfig } from "@expo/config";

const defineConfig = ({ config }: { config: ExpoConfig }): ExpoConfig => {
  const buildProfile =
    process.env.EAS_BUILD_PROFILE || process.env.APP_ENV || "development";
  const isProduction = buildProfile === "production";
  const existingInfoPlist = config.ios?.infoPlist ?? {};
  const existingBackgroundModes = Array.isArray(existingInfoPlist.UIBackgroundModes)
    ? existingInfoPlist.UIBackgroundModes
    : [];

  return {
    ...config,
    ios: {
      ...config.ios,
      entitlements: {
        ...(config.ios?.entitlements ?? {}),
        "aps-environment": isProduction ? "production" : "development",
      },
      infoPlist: {
        ...existingInfoPlist,
        UIBackgroundModes: Array.from(
          new Set([...existingBackgroundModes, "remote-notification"]),
        ),
      },
    },
    extra: {
      ...config.extra,
      apiBaseUrl: process.env.API_BASE_URL || "https://meghdoot.imd.gov.in",
    },
  };
};

export default defineConfig;
