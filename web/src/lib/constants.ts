// Curated options presented in the generation form. Voice names follow the
// upstream edge-tts convention (`<locale>-<Voice>Neural-<Gender>`); Azure V2
// voices are only shown when the admin has configured an Azure Speech key.

export const EDGE_VOICES = [
  "en-US-JennyNeural-Female",
  "en-US-GuyNeural-Male",
  "en-US-AriaNeural-Female",
  "en-US-ChristopherNeural-Male",
  "en-GB-SoniaNeural-Female",
  "en-GB-RyanNeural-Male",
  "en-AU-NatashaNeural-Female",
  "de-DE-KatjaNeural-Female",
  "de-DE-ConradNeural-Male",
  "fr-FR-DeniseNeural-Female",
  "fr-FR-HenriNeural-Male",
  "es-ES-ElviraNeural-Female",
  "es-MX-JorgeNeural-Male",
  "pt-BR-FranciscaNeural-Female",
  "it-IT-IsabellaNeural-Female",
  "ja-JP-NanamiNeural-Female",
  "ko-KR-SunHiNeural-Female",
  "hi-IN-SwaraNeural-Female",
  "ar-SA-ZariyahNeural-Female",
  "zh-CN-XiaoxiaoNeural-Female",
  "zh-CN-YunxiNeural-Male",
  "zh-CN-XiaoyiNeural-Female",
];

export const FONTS = [
  "STHeitiMedium.ttc",
  "STHeitiLight.ttc",
  "MicrosoftYaHeiBold.ttc",
  "MicrosoftYaHeiNormal.ttc",
  "BeVietnamPro-Bold.ttf",
  "BeVietnamPro-Medium.ttf",
  "Charm-Bold.ttf",
  "Charm-Regular.ttf",
  "UTM Kabel KT.ttf",
];

export const LANGUAGES = [
  { value: "", label: "Auto (same as topic)" },
  { value: "en-US", label: "English" },
  { value: "de-DE", label: "German" },
  { value: "fr-FR", label: "French" },
  { value: "es-ES", label: "Spanish" },
  { value: "pt-BR", label: "Portuguese" },
  { value: "it-IT", label: "Italian" },
  { value: "ja-JP", label: "Japanese" },
  { value: "ko-KR", label: "Korean" },
  { value: "hi-IN", label: "Hindi" },
  { value: "ar-SA", label: "Arabic" },
  { value: "zh-CN", label: "Chinese (Simplified)" },
];
