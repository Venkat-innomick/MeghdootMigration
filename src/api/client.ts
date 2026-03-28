import Constants from "expo-constants";
import { API_BASE_URL } from "../constants/api";
import i18n from "../locales/i18n";

const baseURL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ||
  API_BASE_URL;

const getOfflineMessage = () =>
  i18n.t("common.connectToInternet", {
    defaultValue:
      "Your internet connection is not good. Please improve the connection, otherwise you may not be able to see any data.",
  });

export const extractApiErrorMessage = (payload: any): string => {
  const candidates = [
    payload?.errorMessage,
    payload?.ErrorMessage,
    payload?.message,
    payload?.Message,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
};

type ApiClientResponse<T> = { data: T };

const withTimeout = async <T>(promise: Promise<T>, ms: number): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Request timeout")), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const request = async <T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<ApiClientResponse<T>> => {
  const url = `${baseURL}${path}`;
  console.log("URL:", url);
  console.log("payload", body);
  let response: Response;
  try {
    response = await withTimeout(
      fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      }),
      30000,
    );
  } catch (error: any) {
    const message = String(error?.message || "");
    if (message === "Network request failed" || message === "Failed to fetch") {
      throw new Error(getOfflineMessage());
    }
    throw error;
  }

  let data: any = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message = data?.errorMessage || data?.message || "Network error";
    throw new Error(message);
  }

  return { data: data as T };
};

export const apiClient = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
};
