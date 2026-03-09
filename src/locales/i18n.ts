import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en';
import te from './te';
import hi from './hi';
import asLang from './as';
import gu from './gu';
import kn from './kn';
import ml from './ml';
import mr from './mr';
import or from './or';
import ta from './ta';
import pa from './pa';
import bn from './bn';
import arEG from './ar-EG';

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v3',
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: { translation: en },
    te: { translation: te },
    hi: { translation: hi },
    as: { translation: asLang },
    gu: { translation: gu },
    kn: { translation: kn },
    ml: { translation: ml },
    mr: { translation: mr },
    or: { translation: or },
    ta: { translation: ta },
    pa: { translation: pa },
    bn: { translation: bn },
    'ar-EG': { translation: arEG },
  },
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
