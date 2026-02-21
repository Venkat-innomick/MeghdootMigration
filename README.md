# AGROMET React Native Migration (Expo + EAS)

This folder contains a React Native migration scaffold of the Xamarin AGROMET app.

## Migrated Structure

- `src/navigation`: Root stack + onboarding + auth + drawer + bottom tabs.
- `src/api`: API client and service methods mapped from Xamarin `APIConstants` and web API service classes.
- `src/screens`: Screen set matching Xamarin modules:
  - Onboarding: language + 3 intro screens
  - Auth: login, registration, terms, profile
  - Home tabs: dashboard, forecast, locations
  - Drawer/menu: all crops, favourites, nowcast, notifications, disclaimer, about
  - Other: crop advisory, search
- `src/store`: persisted app state (auth, language, onboarding)
- `assets`: fonts, icon, splash, lottie json copied from Xamarin resources

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Start Expo:

```bash
npm run start
```

3. Run on Android/iOS:

```bash
npm run android
npm run ios
```

## EAS Build

1. Login and configure EAS:

```bash
eas login
eas build:configure
```

2. Update these values before production:
- `app.json` -> `expo.extra.eas.projectId`
- `app.json` -> `ios.bundleIdentifier`
- `app.json` -> `android.package`

3. Build:

```bash
eas build --platform android --profile production
eas build --platform ios --profile production
```

## Notes

- This is a functional migration foundation with key flows and API wiring.
- Some screens are placeholders where Xamarin-specific UI logic should be ported in detail.
- Existing backend endpoints are preserved from Xamarin `APIConstants.cs`.
