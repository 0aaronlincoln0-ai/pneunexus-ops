import { describe, expect, it } from "vitest";
import { englishSpeechVoices, selectPreferredSpeechVoice } from "./speech-voice";

function voice(
  name: string,
  lang = "en-US",
  overrides: Partial<{
    default: boolean;
    localService: boolean;
    voiceURI: string;
  }> = {},
) {
  return {
    name,
    lang,
    default: overrides.default ?? false,
    localService: overrides.localService ?? true,
    voiceURI: overrides.voiceURI ?? name,
  };
}

describe("Pocket Technician speech voice selection", () => {
  it("prefers a warm female voice name over a generic default voice", () => {
    const selected = selectPreferredSpeechVoice([
      voice("Alex", "en-US", { default: true }),
      voice("Samantha"),
      voice("Thomas", "en-GB"),
    ]);

    expect(selected?.name).toBe("Samantha");
  });

  it("honors a saved manual voice selection", () => {
    const selected = selectPreferredSpeechVoice(
      [voice("Samantha"), voice("Moira", "en-IE", { voiceURI: "voice-moira" })],
      "voice-moira",
    );

    expect(selected?.name).toBe("Moira");
  });

  it("only offers English voices and ranks the warmest choices first", () => {
    expect(
      englishSpeechVoices([voice("Amelie", "fr-FR"), voice("Daniel", "en-GB"), voice("Ava")]).map(
        ({ name }) => name,
      ),
    ).toEqual(["Ava", "Daniel"]);
  });
});
