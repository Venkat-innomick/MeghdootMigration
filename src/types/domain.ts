export interface ApiResponse<T = unknown> {
  isSuccessful?: boolean;
  errorMessage?: string;
  result?: T;
  data?: T;
}

export interface UserProfile {
  userProfileId: number;
  firstName: string;
  lastName: string;
  mobileNumber: string;
  imagePath?: string;
  isLogout?: boolean;
  typeOfRole?: number;
}

export interface DashboardLocation {
  stateID: number;
  districtID: number;
  blockID?: number;
  asdID?: number;
  stateName?: string;
  districtName?: string;
  blockName?: string;
  isCurrentLocation?: boolean;
}

export interface WeatherForecastItem {
  date?: string;
  maxTemp?: number;
  minTemp?: number;
  humidity?: number;
  windSpeed?: number;
  weather?: string;
}

export interface CropAdvisoryItem {
  cropAdvisoryID?: number;
  cropName?: string;
  cropCategoryName?: string;
  advisoryText?: string;
  imagePath?: string;
  videoPath?: string;
  audioPath?: string;
  isFavourite?: boolean;
}

export interface NotificationItem {
  id?: number;
  title?: string;
  message?: string;
  date?: string;
  isRead?: boolean;
}

export interface StateMasterItem {
  stateID: number;
  stateName: string;
}

export interface DistrictMasterItem {
  districtID: number;
  districtName: string;
  stateID: number;
}

export interface BlockMasterItem {
  blockID: number;
  blockName: string;
  districtID: number;
}

export interface AsdMasterItem {
  asdID: number;
  asdName: string;
  districtID: number;
}
