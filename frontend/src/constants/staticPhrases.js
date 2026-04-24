// Shared source of truth for fixed, LLM-independent phrases that are both:
//   (a) displayed in the UI and/or spoken by TTS, and
//   (b) pre-baked into audio files at build time via scripts/gen-audio.mjs.
//
// If you edit any text below, re-run `npm run gen-audio` to refresh the
// cached clips in public/audio/, otherwise the spoken audio will drift
// from what the UI shows.

export const staticPhrases = {
  welcome: {
    en: "Hi I'm Swara. I can help you with any information about NavGurukul. What would you like to know today?",
    hi: 'नमस्ते मैं स्वरा हूँ मैं नवगुरुकुल के बारे में आपकी किसी भी प्रकार की सहायता कर सकती हूँ। बताइए, आज आप क्या जानना चाहेंगे?'
  },
  setup_intro: {
    en: "Let's test your microphone and speaker.",
    hi: 'चलिए माइक्रोफोन और स्पीकर टेस्ट करते हैं।'
  },
  selection_intro: {
    en: "Hi I'm Swara. To get started, please tell me — are you a student, a parent, or a partner?",
    hi: 'नमस्ते मैं स्वरा हूँ आगे बढ़ने के लिए कृपया बताइए — क्या आप छात्र हैं, माता-पिता हैं, या भागीदार हैं?'
  }
};

export const voiceModels = {
  en: 'Indian_accent_1',
  hi: 'hi_IN-priyamvada-medium'
};
