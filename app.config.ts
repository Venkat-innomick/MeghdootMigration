import type { ExpoConfig } from "@expo/config";

const defineConfig = ({ config }: { config: ExpoConfig }): ExpoConfig => {
  return {
    ...config,
    extra: {
      ...config.extra,
      apiBaseUrl: process.env.API_BASE_URL || "https://meghdoot.imd.gov.in",
    },
  };
};

export default defineConfig;
