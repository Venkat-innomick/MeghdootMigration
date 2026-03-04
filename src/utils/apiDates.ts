const pad = (value: number) => String(value).padStart(2, "0");

export const getCurrentServiceDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export const API_REFRESH_DATES = {
  current: () => getCurrentServiceDate(),
  searchMasters: "2019-01-01",
  favourites: "2019-01-01",
  attachments: "2019-07-02",
  blockMasters: "2018-01-01",
} as const;
