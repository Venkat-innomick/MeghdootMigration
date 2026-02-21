export const LANGUAGES = [
  { label: 'English', code: 'en' },
  { label: 'Telugu', code: 'te' },
  { label: 'Hindi', code: 'hi' },
  { label: 'Assamese', code: 'as' },
  { label: 'Gujarati', code: 'gu' },
  { label: 'Kannada', code: 'kn' },
  { label: 'Malayalam', code: 'ml' },
  { label: 'Marathi', code: 'mr' },
  { label: 'Oriya', code: 'or' },
  { label: 'Tamil', code: 'ta' },
  { label: 'Punjabi', code: 'pa' },
  { label: 'Bengali', code: 'bn' },
  { label: 'Mizoram', code: 'ar-EG' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];
