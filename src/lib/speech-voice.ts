export interface SpeechVoiceCandidate {
  default: boolean;
  lang: string;
  localService: boolean;
  name: string;
  voiceURI: string;
}

const warmVoiceNames = [
  "samantha",
  "ava",
  "aria",
  "jenny",
  "sonia",
  "zira",
  "victoria",
  "serena",
  "karen",
  "moira",
  "tessa",
  "libby",
  "hazel",
  "susan",
  "fiona",
  "veena",
  "salli",
  "joanna",
  "kendra",
  "kimberly",
  "ivy",
];

const lessSuitableVoiceNames = [
  "albert",
  "alex",
  "daniel",
  "fred",
  "jorge",
  "ralph",
  "thomas",
  "whisper",
  "bells",
  "zarvox",
];

function voiceScore(voice: SpeechVoiceCandidate): number {
  const name = voice.name.toLowerCase();
  const language = voice.lang.toLowerCase();
  if (!language.startsWith("en")) return -1_000;

  let score = 0;
  if (language === "en-us") score += 45;
  else if (language === "en-gb") score += 38;
  else if (language === "en-au" || language === "en-ie") score += 34;
  else score += 25;

  const warmIndex = warmVoiceNames.findIndex((candidate) => name.includes(candidate));
  if (warmIndex >= 0) score += 180 - warmIndex;
  if (lessSuitableVoiceNames.some((candidate) => name.includes(candidate))) score -= 120;
  if (voice.localService) score += 8;
  if (voice.default) score += 5;
  if (name.includes("enhanced") || name.includes("premium") || name.includes("natural"))
    score += 20;

  return score;
}

export function englishSpeechVoices<T extends SpeechVoiceCandidate>(voices: T[]): T[] {
  return voices
    .filter((voice) => voice.lang.toLowerCase().startsWith("en"))
    .sort(
      (left, right) => voiceScore(right) - voiceScore(left) || left.name.localeCompare(right.name),
    );
}

export function selectPreferredSpeechVoice<T extends SpeechVoiceCandidate>(
  voices: T[],
  preferredVoiceURI?: string,
): T | undefined {
  if (preferredVoiceURI) {
    const preferred = voices.find((voice) => voice.voiceURI === preferredVoiceURI);
    if (preferred) return preferred;
  }

  return englishSpeechVoices(voices)[0];
}
