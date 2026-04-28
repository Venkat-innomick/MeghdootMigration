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
  notificationId?: number;
  title?: string;
  notificationTitle?: string;
  message?: string;
  notificationMessage?: string;
  date?: string;
  issueDate?: string;
  timeOfIssueMessage?: string;
  validUpToMessage?: string;
  colorCode?: string;
  isRead?: boolean;
  flag?: boolean;
}

export interface DistrictWarningItem {
  district?: string;
  District?: string;
  date?: string;
  Date?: string;
  refreshDateTime?: string;
  RefreshDateTime?: string;
  day1_Color?: string;
  Day1_Color?: string;
  day2_Color?: string;
  Day2_Color?: string;
  day3_Color?: string;
  Day3_Color?: string;
  day4_Color?: string;
  Day4_Color?: string;
  day5_Color?: string;
  Day5_Color?: string;
  day_1?: string;
  Day_1?: string;
  day_2?: string;
  Day_2?: string;
  day_3?: string;
  Day_3?: string;
  day_4?: string;
  Day_4?: string;
  day_5?: string;
  Day_5?: string;
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
