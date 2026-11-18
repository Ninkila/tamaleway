export type PrebuiltVoiceName = "Kore" | "Puck" | "Charon" | "Fenrir" | "Zephyr";

export interface DagbaniVoiceProfile {
  voiceName: PrebuiltVoiceName;
  gender: "female" | "male";
  voiceTitle: string;
  style: string;
  pitch: number;
  rate: number;
}

export const NPC_VOICE_PROFILES: Record<string, DagbaniVoiceProfile> = {
  mama_fati: {
    voiceName: "Kore",
    gender: "female",
    voiceTitle: "Dagomba Market Elder Woman",
    style:
      "Authentic native Dagomba market woman in Tamale Central Market, Northern Ghana, speaking with warm rhythmic Dagbani tonal cadence, West African Ghanaian accent, and lively market friendliness.",
    pitch: 0.96,
    rate: 0.93,
  },
  alhassan_weaver: {
    voiceName: "Charon",
    gender: "male",
    voiceTitle: "Dagomba Master Weaver (Elder)",
    style:
      "Dignified elder Dagomba man from Tamale, Northern Ghana, deep resonant calm voice, authentic Northern Ghanaian Dagbani accent, measured oral storyteller cadence.",
    pitch: 0.82,
    rate: 0.87,
  },
  yakubu_rider: {
    voiceName: "Puck",
    gender: "male",
    voiceTitle: "Young Tamale Pragya Rider",
    style:
      "Energetic young Dagomba man from Tamale, Northern Ghana, lively Northern Ghanaian street cadence, warm Dagbani inflection and upbeat friendly rhythm.",
    pitch: 1.0,
    rate: 1.02,
  },
  mariama_teacher: {
    voiceName: "Zephyr",
    gender: "female",
    voiceTitle: "Northern Ghanaian Educator",
    style:
      "Warm, articulate Dagomba woman educator from Tamale, Northern Ghana, clear Northern Ghanaian Dagbani accent, gentle patient vowel pronunciation.",
    pitch: 1.02,
    rate: 0.94,
  },
  imam_salifu: {
    voiceName: "Charon",
    gender: "male",
    voiceTitle: "Tamale Elder Scholar",
    style:
      "Serene elder Dagomba scholar from Central Mosque, Tamale, Northern Ghana, deep gentle voice with respectful Northern Ghanaian Dagbani intonation.",
    pitch: 0.8,
    rate: 0.85,
  },
  fuseini_mechanic: {
    voiceName: "Fenrir",
    gender: "male",
    voiceTitle: "Lamashegu Artisan",
    style:
      "Hearty, friendly Dagomba mechanic from Lamashegu, Tamale, Northern Ghana, grounded Northern Ghanaian Dagbani accent and warm conversational pace.",
    pitch: 0.88,
    rate: 0.95,
  },
  asana_potter: {
    voiceName: "Kore",
    gender: "female",
    voiceTitle: "Kukuo Woman Potter",
    style:
      "Warm elder Dagomba woman artisan from Kukuo, Tamale, Northern Ghana, soft earthy Northern Ghanaian Dagbani cadence and calm welcoming tone.",
    pitch: 0.92,
    rate: 0.9,
  },
  nurse_amina: {
    voiceName: "Zephyr",
    gender: "female",
    voiceTitle: "Tamale Clinic Nurse",
    style:
      "Caring, composed Dagomba woman nurse at Tamale Teaching Hospital, Northern Ghana, clear Northern Ghanaian Dagbani accent and reassuring warmth.",
    pitch: 1.0,
    rate: 0.95,
  },
  ibrahim_curator: {
    voiceName: "Charon",
    gender: "male",
    voiceTitle: "Tamale Cultural Curator",
    style:
      "Thoughtful Dagomba cultural curator from Tamale, Northern Ghana, warm Northern Ghanaian Dagbani accent, poised and expressive delivery.",
    pitch: 0.9,
    rate: 0.93,
  },
};

export const CROWD_DAGBANI_VOICE_STYLES: Record<PrebuiltVoiceName, string> = {
  Kore: "Native Dagomba woman trader in Tamale Central Market, Northern Ghana, calling out warmly in natural Dagbani cadence.",
  Zephyr: "Warm young Dagomba woman shopper in Tamale, Northern Ghana, speaking naturally with authentic Dagbani tonal rhythm.",
  Charon: "Dignified Dagomba elder in Tamale, Northern Ghana, speaking calmly in authentic Northern Ghanaian Dagbani inflection.",
  Puck: "Lively young Dagomba street vendor in Tamale, Northern Ghana, cheerful Northern Ghanaian Dagbani accent.",
  Fenrir: "Friendly Dagomba artisan in Tamale, Northern Ghana, speaking warmly with natural Northern Ghanaian Dagbani rhythm.",
};

const DAGBANI_WORD_PHONETICS: Array<[RegExp, string]> = [
  [/\btamale\b/gi, "Tah-mah-leh"],
  [/\bdagbani\b/gi, "Dag-bah-ni"],
  [/\bdagbon\b/gi, "Dag-bohn"],
  [/\bwaakye\b/gi, "Wah-cheh"],
  [/\bpragya\b/gi, "Pra-ja"],
  [/\bbatakari\b/gi, "Ba-ta-ka-ri"],
  [/\baboabo\b/gi, "A-bo-a-bo"],
  [/\blamashegu\b/gi, "La-ma-she-gu"],
  [/\bsagnarigu\b/gi, "Sag-na-ri-gu"],
  [/\bkalpohin\b/gi, "Kal-po-hin"],
  [/\bgukpegu\b/gi, "Guk-peh-gu"],
  [/\bdakpema\b/gi, "Dak-peh-ma"],
  [/\bkukuo\b/gi, "Ku-ku-oh"],
  [/\bdasuba\b/gi, "Da-su-ba"],
  [/\bantire\b/gi, "An-ti-reh"],
  [/\bwuntaŋa\b/gi, "Wun-tan-ga"],
  [/\bwuntanga\b/gi, "Wun-tan-ga"],
  [/\bzaawuni\b/gi, "Zaa-wu-ni"],
  [/\balaafee\b/gi, "A-laa-feh"],
  [/\bbeela\b/gi, "beh-la"],
  [/\bm['’]?paɣiya\b/gi, "Mpah-ghi-ya"],
  [/\bmpaɣiya\b/gi, "Mpah-ghi-ya"],
  [/\bsaɣim\b/gi, "Sah-ghim"],
  [/\bkpakpili\b/gi, "Kpak-pili"],
  [/\bnyuli\b/gi, "Nyu-li"],
  [/\bnyɛla\b/gi, "nyeh-la"],
  [/\bboogima\b/gi, "Bo-o-gi-ma"],
  [/\bbɛŋa\b/gi, "Beh-nga"],
  [/\bbiɛɣuni\b/gi, "Byeh-ghu-ni"],
  [/\byɛltɔɣa\b/gi, "yehl-toh-gha"],
  [/\bzɔri\b/gi, "Zoh-ri"],
  [/\blaɣiri\b/gi, "La-ghi-ri"],
  [/\bjiŋli\b/gi, "Jing-li"],
  [/\bduɣu\b/gi, "Du-ghu"],
  [/\bkɔɔsɛ\b/gi, "Koh-seh"],
  [/\btiŋa\b/gi, "ting-a"],
  [/\btiŋgbani\b/gi, "ting-ba-ni"],
  [/\bsuŋ\b/gi, "sung"],
  [/\bgbanɔ\b/gi, "gba-noh"],
  [/\bshinkaafa\b/gi, "shin-kaa-fa"],
  [/\bkpaŋsiri\b/gi, "kpang-si-ri"],
  [/\bwuɣibu\b/gi, "wu-ghi-bu"],
  [/\bwuɣira\b/gi, "wu-ghi-ra"],
  [/\bbaɣira\b/gi, "ba-ghi-ra"],
  [/\bkarimbu\b/gi, "ka-rim-bu"],
  [/\bbɔɔli\b/gi, "boh-li"],
];

/**
 * Converts Dagbani orthography & Tamale place names into phonetic hints
 * for fallback speech synthesis without modifying displayed Dagbani text.
 */
export function toDagbaniSpokenText(text: string): string {
  let out = text;
  for (const [pattern, replacement] of DAGBANI_WORD_PHONETICS) {
    out = out.replace(pattern, replacement);
  }
  return out
    .replace(/ɛ/g, "eh")
    .replace(/Ɛ/g, "Eh")
    .replace(/ɔ/g, "oh")
    .replace(/Ɔ/g, "Oh")
    .replace(/ɣ/g, "gh")
    .replace(/Ɣ/g, "Gh")
    .replace(/ŋ/g, "ng")
    .replace(/Ŋ/g, "Ng");
}

/**
 * Picks the closest West African / Ghanaian / warm English voice available
 * on the player's browser for fallback speech synthesis.
 */
export function selectLocalGhanaianSpeechVoice(
  voices: SpeechSynthesisVoice[],
  preferFemale: boolean
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  const preferredLangs = ["en-gh", "en-ng", "en-ke", "en-za", "en-gb"];
  for (const lang of preferredLangs) {
    const matches = voices.filter((v) => v.lang.toLowerCase().startsWith(lang));
    if (matches.length > 0) {
      const gendered = matches.find((v) =>
        preferFemale
          ? /female|woman|libby|sonia|hazel|susan|serena|kate|tessa|zuri|amara|ada/i.test(v.name)
          : /male|man|ryan|george|daniel|oliver|arthur|abi|emeka|thabo/i.test(v.name)
      );
      return gendered ?? matches[0];
    }
  }

  const nameMatch = voices.find((v) =>
    preferFemale
      ? /female|woman|natural|serena|samantha|karen|moira|tessa/i.test(v.name)
      : /male|man|daniel|alex|fred|arthur|oliver|george/i.test(v.name)
  );
  return nameMatch ?? voices[0];
}
