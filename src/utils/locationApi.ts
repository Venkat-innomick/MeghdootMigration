import { LANGUAGES } from "../constants/languages";

export const toNum = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (
    typeof value === "string" &&
    value.trim() &&
    !Number.isNaN(Number(value))
  ) {
    return Number(value);
  }
  return fallback;
};

export const toText = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value))
      return String(value);
  }
  return "";
};

export const pickList = <T = any>(payload: any, keys: string[]): T[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as T[];
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key] as T[];
  }
  return [];
};

export const getLanguageLabel = (code: string) =>
  LANGUAGES.find((item) => item.code === code)?.label || "English";

export const getUserProfileId = (user: any) => {
  const values = [
    user?.typeOfRole,
    user?.TypeOfRole,
    user?.userProfileId,
    user?.UserProfileID,
    user?.userId,
    user?.UserId,
  ];
  for (const value of values) {
    const id = toNum(value, 0);
    if (id > 0) return id;
  }
  return 0;
};

export const buildByLocationPayload = (
  userId: number,
  languageLabel: string,
) => ({
  Id: userId,
  LanguageType: languageLabel,
  RefreshDateTime: "2025-12-26",
});

export const parseLocationWeatherList = (response: any) =>
  pickList<any>(
    (response as any)?.result || (response as any)?.data || response,
    [
      "objWeatherForecastNextList",
      "ObjWeatherForecastNextList",
      "objWeatherForecastFinalList",
      "ObjWeatherForecastFinalList",
      "objWeatherForecastList",
      "ObjWeatherForecastList",
      "locationWeatherList",
      "LocationWeatherList",
      "weatherCollection",
      "WeatherCollection",
    ],
  );

export const isApiSuccess = (response: any) => {
  const value = response?.isSuccessful ?? response?.IsSuccessful;
  if (typeof value === "boolean") return value;
  return !response?.errorMessage && !response?.ErrorMessage;
};

export const sameLocation = (
  item: any,
  target: { districtID: number; blockID: number; asdID: number },
) => {
  const districtID = toNum(item?.districtID ?? item?.DistrictID);
  const blockID = toNum(item?.blockID ?? item?.BlockID);
  const asdID = toNum(item?.asdID ?? item?.AsdID);

  if (target.asdID > 0) {
    return districtID === target.districtID && asdID === target.asdID;
  }
  return districtID === target.districtID && blockID === target.blockID;
};
