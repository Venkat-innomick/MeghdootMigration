export const API_BASE_URL = "https://meghdoot-app.tropmet.res.in:8443";

export const API_ENDPOINTS = {
  crop: {
    getCropAdvisory: "/api/CropAdvisory/GetCropAdvisory",
    getCropAdvyCropMapping: "/api/CropAdvisory/GetCropAdvyCropMapping",
    getCropAdvisoryById: "/api/CropAdvisory/GetCropAdvisoryByID",
    getCropAdvisoryAttachments: "/api/CropAdvisory/GetCropAdvisoryAttachments",
    getCropCategory: "/api/CropAdvisory/GetCropCategory",
    getCrops: "/api/CropAdvisory/GetCrops",
    getCropAdvisoryFavouriteList:
      "/api/CropAdvisory/GetCropAdvisoryFavouriteList",
    saveCropAdvisoryFavouriteList:
      "/api/CropAdvisory/SaveCropAdvisoryFavouriteList",
    saveCropAdvisoryFeedbackList:
      "/api/CropAdvisory/SaveCropAdvisoryFeedbackList",
    getCropAdvisoryTopValues: "/api/CropAdvisory/GetCropAdvisoryTopValues",
    getGpsCropAdvisoryTopValues:
      "/api/CropAdvisory/GetGPSCropAdvisoryTopValues",
    getCropAdvisoryFavouriteRatingList:
      "/api/CropAdvisory/GetCropAdvisoryFavouriteRatingList",
    deleteCropAdvFavLocations:
      "/api/CropAdvisory/RemoveCropAdvisoryFavouriteList",
  },
  masters: {
    getTitleMasterList: "/api/Masters/GetTitleMasterList",
    getStateMasterList: "/api/Masters/GetStateMasterList",
    getDistrictMasterList: "/api/Masters/GetDistrictMasterList",
    getBlockMasterList: "/api/Masters/GetBlockMasterList",
    getAsdMasterList: "/api/Masters/GetASDMasterList",
    getLanguageMasterList: "/api/Masters/GetLanguageMasterList",
    getCountryCodeMasterList: "/api/Masters/GetCountryCodeMasterList",
    getGenderMasterList: "/api/Masters/GetGenderMasterList",
  },
  notifications: {
    getNotifications: "/api/Notifications/GetNotifications",
    getDistrictNowCast: "/api/Notifications/GetDistrictNowCast",
    getDistrictWarnings: "/api/Notifications/GetDistrictWarnings",
    addOrUpdateMobileToken: "/api/Notifications/AddOrUpdateMobileTokens",
    deleteMobileToken: "/api/Notifications/DeleteMobileTokens",
    getMobileToken: "/api/Notifications/GetMobileTokens",
    userNotification: "/api/Notifications/GetNotificationDetails",
    nowCast: "/api/Notifications/GetValidNowCastNowDetails",
    clearNotification: "/api/Notifications/ClearNotificationDetails",
  },
  users: {
    getUserLoginDetails: "/api/Users/GetUserLoginDetails",
    postUserProfile: "/api/Users/SaveUserProfilImage",
    saveUserLocations: "/api/Users/SaveUserLocations",
    deleteUserLocations: "/api/Users/RemoveUserLocations",
    saveFarmer: "/api/Users/SaveFarmer",
  },
  weather: {
    getObservedWeatherDetails: "/api/Weather/GetObservedWeather",
    getWeatherForecastDetails: "/api/Weather/GetWeatherForecastDetails",
    getWeatherDetailsByLocation:
      "/api/Weather/GetWeatherForecastDetailsByLocation",
    getTodayWeather: "/api/Weather/GetTodayWeather",
  },
} as const;
