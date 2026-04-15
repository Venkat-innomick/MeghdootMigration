import { LANGUAGES } from "../constants/languages";
import { API_REFRESH_DATES } from "./apiDates";

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
  coords?: { latitude: number; longitude: number } | null,
) => {
  const payload: Record<string, unknown> = {
    Id: userId,
    LanguageType: languageLabel,
    RefreshDateTime: API_REFRESH_DATES.current(),
  };

  if (coords) {
    payload.Latitude = coords.latitude;
    payload.Longitude = coords.longitude;
  }

  return payload;
};

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

export const parseUserLocationsList = (response: any) =>
  pickList<any>((response as any)?.result || (response as any)?.data || response, [
    "objUserLocationsList",
    "ObjUserLocationsList",
  ]);

export const getUserProfileMappedLocation = (user: any) => {
  if (!user) return null;

  const stateID = toNum(user?.stateID ?? user?.StateID, 0);
  const districtID = toNum(user?.districtID ?? user?.DistrictID, 0);
  const blockID = toNum(user?.blockID ?? user?.BlockID, 0);
  const asdID = toNum(user?.asdID ?? user?.AsdID, 0);

  if (stateID <= 0 || districtID <= 0) {
    return null;
  }

  return {
    stateID,
    districtID,
    blockID,
    asdID,
    stateName: toText(user?.stateName, user?.StateName),
    districtName: toText(user?.districtName, user?.DistrictName),
    blockName: toText(user?.blockName, user?.BlockName),
    asdName: toText(user?.asdName, user?.AsdName),
  };
};

export const mergeUserProfileLocation = <T extends any>(
  locations: T[],
  user: any,
): T[] => {
  const profileLocation = getUserProfileMappedLocation(user);
  if (!profileLocation) return locations;

  const profileIndex = (locations || []).findIndex((item: any) => {
    const stateID = toNum(item?.stateID ?? item?.StateID, 0);
    const districtID = toNum(item?.districtID ?? item?.DistrictID, 0);
    const blockID = toNum(item?.blockID ?? item?.BlockID, 0);
    const asdID = toNum(item?.asdID ?? item?.AsdID, 0);

    return (
      stateID === profileLocation.stateID &&
      districtID === profileLocation.districtID &&
      blockID === profileLocation.blockID &&
      asdID === profileLocation.asdID
    );
  });

  if (profileIndex >= 0) {
    const nextLocations = [...locations];
    nextLocations[profileIndex] = {
      ...(nextLocations[profileIndex] as any),
      ...profileLocation,
      StateID: profileLocation.stateID,
      DistrictID: profileLocation.districtID,
      BlockID: profileLocation.blockID,
      AsdID: profileLocation.asdID,
      StateName: profileLocation.stateName,
      DistrictName: profileLocation.districtName,
      BlockName: profileLocation.blockName,
      AsdName: profileLocation.asdName,
    };
    return nextLocations as T[];
  }

  return ([...locations, profileLocation] as T[]);
};

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
