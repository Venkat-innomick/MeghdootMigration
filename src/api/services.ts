import { apiClient } from "./client";
import { API_ENDPOINTS } from "../constants/api";
import {
  ApiResponse,
  AsdMasterItem,
  BlockMasterItem,
  CropAdvisoryItem,
  DashboardLocation,
  DistrictMasterItem,
  NotificationItem,
  StateMasterItem,
  UserProfile,
  WeatherForecastItem,
} from "../types/domain";

const pickList = <T>(payload: any, keys: string[]): T[] => {
  if (!payload) return [];
  for (const key of keys) {
    const value = payload?.[key];
    if (Array.isArray(value)) return value as T[];
  }
  return [];
};

export const userService = {
  login: async (payload: { mobileNo: string; languageType: string }) => {
    const { data } = await apiClient.post<ApiResponse<UserProfile>>(
      API_ENDPOINTS.users.getUserLoginDetails,
      payload,
    );
    return data;
  },
  register: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post<ApiResponse>(
      API_ENDPOINTS.users.saveFarmer,
      payload,
    );
    return data;
  },
  saveProfile: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post<ApiResponse>(
      API_ENDPOINTS.users.postUserProfile,
      payload,
    );
    return data;
  },
  saveLocation: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post<ApiResponse>(
      API_ENDPOINTS.users.saveUserLocations,
      payload,
    );
    return data;
  },
  deleteLocation: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post<ApiResponse>(
      API_ENDPOINTS.users.deleteUserLocations,
      payload,
    );
    return data;
  },
};

export const weatherService = {
  getForecast: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post<ApiResponse<WeatherForecastItem[]>>(
      API_ENDPOINTS.weather.getWeatherForecastDetails,
      payload,
    );
    return data;
  },
  getObserved: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post<ApiResponse<WeatherForecastItem[]>>(
      API_ENDPOINTS.weather.getObservedWeatherDetails,
      payload,
    );
    return data;
  },
  getByLocation: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post<ApiResponse<DashboardLocation[]>>(
      API_ENDPOINTS.weather.getWeatherDetailsByLocation,
      payload,
    );
    return data;
  },
  getTodayWeather: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post<ApiResponse<WeatherForecastItem[]>>(
      API_ENDPOINTS.weather.getTodayWeather,
      payload,
    );
    return data;
  },
};

export const cropService = {
  getAdvisory: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post<ApiResponse<any[]>>(
      API_ENDPOINTS.crop.getCropAdvisory,
      payload,
    );
    return data;
  },
  getAdvisoryById: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post<ApiResponse<any[]>>(
      API_ENDPOINTS.crop.getCropAdvisoryById,
      payload,
    );
    return data;
  },
  getAdvisoryAttachments: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post<ApiResponse<any[]>>(
      API_ENDPOINTS.crop.getCropAdvisoryAttachments,
      payload,
    );
    return data;
  },
  getAdvisoryTop: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post<ApiResponse<CropAdvisoryItem[]>>(
      API_ENDPOINTS.crop.getCropAdvisoryTopValues,
      payload,
    );
    return data;
  },
  getGpsAdvisoryTop: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post<ApiResponse<CropAdvisoryItem[]>>(
      API_ENDPOINTS.crop.getGpsCropAdvisoryTopValues,
      payload,
    );
    return data;
  },
  getFavourites: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post<ApiResponse<CropAdvisoryItem[]>>(
      API_ENDPOINTS.crop.getCropAdvisoryFavouriteList,
      payload,
    );
    return data;
  },
  toggleFavourite: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post<ApiResponse>(
      API_ENDPOINTS.crop.saveCropAdvisoryFavouriteList,
      payload,
    );
    return data;
  },
  removeFavourite: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post<ApiResponse>(
      API_ENDPOINTS.crop.deleteCropAdvFavLocations,
      payload,
    );
    return data;
  },
  saveFeedback: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post<ApiResponse>(
      API_ENDPOINTS.crop.saveCropAdvisoryFeedbackList,
      payload,
    );
    return data;
  },
  getCategories: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post<ApiResponse<any[]>>(
      API_ENDPOINTS.crop.getCropCategory,
      payload,
    );
    return data;
  },
};

export const notificationService = {
  getUserNotifications: async (userProfileId: number) => {
    const { data } = await apiClient.get<NotificationItem[]>(
      `${API_ENDPOINTS.notifications.userNotification}?userProfileId=${userProfileId}`,
    );
    return data;
  },
  getNowcast: async (userProfileId: number) => {
    const { data } = await apiClient.get<NotificationItem[]>(
      `${API_ENDPOINTS.notifications.nowCast}?userProfileId=${userProfileId}`,
    );
    return data;
  },
  clearNotifications: async (userProfileId: number) => {
    const { data } = await apiClient.get<ApiResponse>(
      `${API_ENDPOINTS.notifications.clearNotification}?userProfileId=${userProfileId}`,
    );
    return data;
  },
  addOrUpdateToken: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post<ApiResponse>(
      API_ENDPOINTS.notifications.addOrUpdateMobileToken,
      payload,
    );
    return data;
  },
};

export const mastersService = {
  getGenders: async (languageType: string) => {
    const { data } = await apiClient.post<any>(
      API_ENDPOINTS.masters.getGenderMasterList,
      {
        GenderID: 0,
        LanguageType: languageType,
        RefreshDateTime: new Date().toISOString().slice(0, 10),
      },
    );
    return pickList<any>(data, ["objGenderMasterList", "ObjGenderMasterList"]);
  },
  getStates: async (languageType: string) => {
    const { data } = await apiClient.post<any>(
      API_ENDPOINTS.masters.getStateMasterList,
      {
        StateID: 0,
        ScientistID: 0,
        LanguageType: languageType,
        RefreshDateTime: "2019-01-01",
      },
    );
    return pickList<StateMasterItem>(data, [
      "objStateMasterList",
      "ObjStateMasterList",
    ]);
  },
  getDistricts: async (stateID: number, languageType: string) => {
    const { data } = await apiClient.post<any>(
      API_ENDPOINTS.masters.getDistrictMasterList,
      {
        StateID: stateID,
        ScientistID: 0,
        LanguageType: languageType,
        RefreshDateTime: "2019-01-01",
      },
    );
    return pickList<DistrictMasterItem>(data, [
      "objDistrictMasterList",
      "ObjDistrictMasterList",
    ]);
  },
  getBlocks: async (districtID: number, languageType: string) => {
    const { data } = await apiClient.post<any>(
      API_ENDPOINTS.masters.getBlockMasterList,
      {
        DistrictID: districtID,
        ScientistID: 0,
        LanguageType: languageType,
        RefreshDateTime: "2018-01-01",
      },
    );
    return pickList<BlockMasterItem>(data, [
      "objBlockMasterList",
      "ObjBlockMasterList",
    ]);
  },
  getAsd: async (districtID: number, languageType: string) => {
    const { data } = await apiClient.post<any>(
      API_ENDPOINTS.masters.getAsdMasterList,
      {
        DistrictID: districtID,
        ScientistID: 0,
        LanguageType: languageType,
        RefreshDateTime: "2018-01-01",
      },
    );
    return pickList<AsdMasterItem>(data, [
      "objAsdMasterList",
      "ObjAsdMasterList",
    ]);
  },
};
