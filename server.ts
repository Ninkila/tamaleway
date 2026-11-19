import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "12mb" }));
app.use(
  "/assets/references",
  express.static(path.resolve(__dirname, "assets", "references"))
);

const SUBMISSIONS_DIR = path.resolve(__dirname, "data");
const SUBMISSIONS_FILE = path.join(SUBMISSIONS_DIR, "community_submissions.json");

interface StoredSubmission {
  id: string;
  contributorName: string;
  contributorAffiliation: string;
  category:
    | "photograph"
    | "location"
    | "event"
    | "historical_record"
    | "dagbani_expression"
    | "architectural_reference";
  title: string;
  community: string;
  description: string;
  dagbaniTerm?: string;
  sourceAndPermission: string;
  mediaUrl?: string;
  status: "pending_review" | "approved" | "needs_revision";
  reviewerNote?: string;
  submittedAt: string;
  reviewedAt?: string;
}

const DEFAULT_SUBMISSIONS: StoredSubmission[] = [
  {
    id: "sub_001",
    contributorName: "Alhaji Abdul-Rahman Yakubu",
    contributorAffiliation: "Dagbon Cultural Historian · Tishigu",
    category: "historical_record",
    title: "Old Dakpema Market & Chief's Courtyard Protocol",
    community: "Dagbandabo Fong (Central Tamale)",
    description:
      "Visitors entering the Dakpema courtyard greet elders respectfully with 'Naa!' and remove sandals when invited into inner reception spaces.",
    sourceAndPermission: "Oral cultural heritage note contributed for educational preservation.",
    status: "approved",
    reviewerNote: "Verified with Dagbon cultural guidance.",
    submittedAt: "2026-10-12T09:30:00Z",
    reviewedAt: "2026-10-13T14:15:00Z",
  },
  {
    id: "sub_002",
    contributorName: "Mariam Fuseini",
    contributorAffiliation: "Kukuo Women's Pottery Cooperative",
    category: "architectural_reference",
    title: "Kukuo Open-Air Clay Firing Mounds",
    community: "Kukuo",
    description:
      "Around Kukuo, wide spherical earthenware water pots (duɣu) and soup bowls are sun-dried on swept yards before firing under dry grass and firewood.",
    dagbaniTerm: "Duɣu (Clay pot)",
    sourceAndPermission: "Cooperative documentation contributed under CC BY-SA 4.0.",
    status: "approved",
    reviewerNote: "Incorporated into Kukuo Pottery Centre 3D scene.",
    submittedAt: "2026-10-19T11:00:00Z",
    reviewedAt: "2026-10-20T16:40:00Z",
  },
  {
    id: "sub_003",
    contributorName: "Ibrahim Mohammed",
    contributorAffiliation: "Lamashegu Youth Mechanics Association",
    category: "location",
    title: "Lamashegu Pragya & Tricycle Repair Sheds",
    community: "Lamashegu",
    description:
      "Along the Salaga Road bend in Lamashegu, dozens of open metal-roofed mechanic bays repair Bajaj Pragyas, Motor King cargo trikes, and vulcanize tires.",
    sourceAndPermission: "Community mapping note submitted for Tamale 3D.",
    status: "pending_review",
    submittedAt: "2026-11-10T15:20:00Z",
  },
];

async function readSubmissions(): Promise<StoredSubmission[]> {
  try {
    const raw = await fs.readFile(SUBMISSIONS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    await fs.mkdir(SUBMISSIONS_DIR, { recursive: true });
    await fs.writeFile(SUBMISSIONS_FILE, JSON.stringify(DEFAULT_SUBMISSIONS, null, 2), "utf8");
    return [...DEFAULT_SUBMISSIONS];
  }
  return [...DEFAULT_SUBMISSIONS];
}

async function writeSubmissions(list: StoredSubmission[]): Promise<void> {
  await fs.mkdir(SUBMISSIONS_DIR, { recursive: true });
  await fs.writeFile(SUBMISSIONS_FILE, JSON.stringify(list, null, 2), "utf8");
}

const VERIFIED_DAGBANI_LEXICON = `
Verified Dagbani vocabulary and expressions (use ONLY these verified words/phrases for Dagbani output; NEVER invent Dagbani words):
- Dasuba! / Antire! (Good morning! / Response: Antire! or Naa!)
- Wuntanga! (Good afternoon!)
- Zaawuni! (Good evening!)
- A beela? (How are you?) -> Alaafee beni (I am fine / Peace is here)
- M'paɣiya / Mpaɣiya (Thank you)
- Ka a yuli? / A yuli bo? (What is your name?) -> N yuli nyɛla ... (My name is ...)
- A yi ya? (Where are you from?) -> N yi Tamale (I am from Tamale)
- Di daa nyɛla ala? (How much does it cost?)
- Boogima! (Please reduce the price for me!)
- Bindirigu (Food), Kom (Water), Saɣim (Tuo Zaafi / TZ), Nyuli (Yam), Bɛŋa (Beans / Waakye), Kpakpili (Shea butter), Batakari (Traditional handwoven smock), Laɣiri (Money), Daa (Market), Pali (Road), Jiŋli (Mosque), Karimbu (School / Learning), Zɔri (Friend), Nira (Person), Biɛɣuni (See you tomorrow).
- Proverb 1: "Nira bi zaŋdi o nuu yini n-gbaari tii" (One person's single hand cannot embrace a baobab tree — meaning unity and community strength).
- Proverb 2: "Zɔri suŋ gari laɣiri" (A good friend is better than money).
`.trim();

function getGeminiClient(apiVersion: "v1beta" | "v1" = "v1beta"): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      apiVersion,
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

app.post("/api/npc/chat", async (req, res) => {
  const {
    npcName,
    npcRole,
    npcDistrict,
    npcPersonality,
    languageMode,
    timePeriod,
    playerMessage,
    history,
    friendshipLevel,
  } = req.body ?? {};

  if (!playerMessage || typeof playerMessage !== "string") {
    return res.status(400).json({ error: "playerMessage is required." });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({
      error: "AI service not configured",
      offlineFallbackRecommended: true,
    });
  }

  try {
    const recentHistory = Array.isArray(history)
      ? history
          .slice(-6)
          .map((m: { speaker?: string; text?: string }) => `${m.speaker ?? "Speaker"}: ${m.text ?? ""}`)
          .join("\n")
      : "";

    const systemInstruction = `
You are roleplaying as ${npcName || "a resident"}, a ${npcRole || "local resident"} in ${npcDistrict || "Tamale"}, Northern Ghana, inside the cultural life-simulation game TAMALE 3D.
Personality & context: ${npcPersonality || "Warm, welcoming, grounded in everyday Tamale life."}
Current time of day in Tamale: ${timePeriod || "Afternoon"}.
Player friendship level: ${friendshipLevel ?? 1}.
Active player language mode: ${languageMode || "mixed"}.

CRITICAL LINGUISTIC INTEGRITY RULES:
1. NEVER invent, guess, or fabricate Dagbani words or grammar.
2. When writing Dagbani phrases, strictly use ONLY verified vocabulary from the lexicon below. If a concept is outside the verified Dagbani lexicon, express that part naturally in English (or simple Mixed mode) instead of fabricating Dagbani.
3. Keep responses warm, concise (2-3 sentences max), and grounded in real Tamale culture (Central Market, Jubilee Park, Central Mosque, Dakpema Cultural Centre, Kalpohin compounds, Pragya tricycles, Tuo Zaafi, shea butter, smock weaving).

${VERIFIED_DAGBANI_LEXICON}
    `.trim();

    const prompt = `
Recent conversation:
${recentHistory || "(Beginning of conversation)"}

Player says: "${playerMessage}"

Respond in character in JSON with:
- replyDagbani: A short respectful response leading with verified Dagbani greetings/phrases and English clarity where needed (never invent Dagbani words).
- replyEnglish: Natural English translation/version of the same response.
- replyMixed: Natural Tamale code-switching combining English and verified Dagbani expressions.
- vocabularyUsed: Array of verified Dagbani words used (from the provided lexicon only).
    `.trim();

    const response = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            replyDagbani: { type: Type.STRING },
            replyEnglish: { type: Type.STRING },
            replyMixed: { type: Type.STRING },
            vocabularyUsed: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
        },
      },
    });

    const raw = (response.text ?? "{}").trim();
    const parsed = JSON.parse(raw);

    return res.json({
      replyDagbani: parsed.replyDagbani || "Antire! Alaafee beni.",
      replyEnglish: parsed.replyEnglish || "Hello! I am doing well here in Tamale.",
      replyMixed: parsed.replyMixed || "Antire! Welcome to Tamale, Alaafee beni.",
      vocabularyUsed: Array.isArray(parsed.vocabularyUsed) ? parsed.vocabularyUsed : [],
      source: "gemini",
    });
  } catch (err) {
    console.error("Gemini NPC chat error:", err);
    return res.status(502).json({
      error: "AI dialogue request failed",
      offlineFallbackRecommended: true,
    });
  }
});

// Transcribe player voice audio for NPC dialogue (uses gemini-3.5-transcribe)
app.post("/api/npc/transcribe", async (req, res) => {
  const { audioBase64, mimeType } = req.body ?? {};
  if (!audioBase64 || typeof audioBase64 !== "string") {
    return res.status(400).json({ error: "audioBase64 is required." });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({
      error: "AI speech transcription is not configured.",
    });
  }

  try {
    const cleanBase64 = audioBase64.includes(",") ? audioBase64.split(",")[1] : audioBase64;
    const safeMime =
      typeof mimeType === "string" && mimeType.startsWith("audio/")
        ? mimeType.split(";")[0]
        : "audio/webm";

    const response = await ai.models.generateContent({
      model: "gemini-3.5-transcribe",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: safeMime,
              data: cleanBase64,
            },
          },
          {
            text: "Transcribe the speaker's words accurately into plain text. The speaker may use English or Dagbani greetings/terms from Tamale, Ghana (such as Dasuba, Antire, Wuntanga, Zaawuni, Alaafee beni, M'paɣiya, Boogima, Kpakpili, Saɣim, Batakari, Pragya, Tamale). Return only the transcribed text.",
          },
        ],
      },
    });

    const transcript = (response.text ?? "").trim();
    return res.json({ transcript });
  } catch (err) {
    console.error("Gemini transcribe error:", err);
    return res.status(502).json({
      error: "Unable to transcribe voice recording right now.",
    });
  }
});

// Simple bounded cache for generated TTS WAV clips so repeated market & NPC phrases replay instantly
const ttsCache = new Map<string, string>();
const MAX_TTS_CACHE = 80;
const ALLOWED_VOICES = new Set(["Puck", "Charon", "Kore", "Fenrir", "Zephyr"]);

const DAGBANI_TTS_PHONETICS: Array<[RegExp, string]> = [
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

function toDagbaniTtsPhonetics(text: string): string {
  let out = text;
  for (const [pattern, replacement] of DAGBANI_TTS_PHONETICS) {
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

// Generate spoken WAV audio with local Dagomba / Northern Ghanaian voice persona
app.post("/api/npc/tts", async (req, res) => {
  const { text, voiceName, style } = req.body ?? {};
  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "text is required." });
  }

  const ai = getGeminiClient("v1beta");
  if (!ai) {
    return res.status(503).json({
      error: "AI voice synthesis is not configured.",
    });
  }

  const rawText = text.trim().slice(0, 360);
  const spokenText = toDagbaniTtsPhonetics(rawText).slice(0, 420);
  const voice = typeof voiceName === "string" && ALLOWED_VOICES.has(voiceName) ? voiceName : "Kore";
  const styleDesc =
    typeof style === "string" && style.trim()
      ? style.trim().slice(0, 220)
      : "Authentic native Dagomba speaker from Tamale, Northern Ghana, speaking with warm Northern Ghanaian Dagbani accent and rhythmic tonal cadence";

  const cacheKey = `v3-dagbani::${voice}::${styleDesc}::${spokenText}`;
  const cached = ttsCache.get(cacheKey);
  if (cached) {
    return res.json({ audioBase64: cached, mimeType: "audio/wav", cached: true });
  }

  const synthesizeGenerateContent = async (
    modelId: "gemini-3.8-flash-lite-tts" | "gemini-3.8-flash-tts",
    includeMetadata: boolean
  ) => {
    const part = includeMetadata
      ? {
          text: spokenText,
          speechMetadata: {
            style: styleDesc,
          },
        }
      : {
          text: `Speak with style (${styleDesc}): ${spokenText}`,
        };

    const response = await ai.models.generateContent({
      model: modelId,
      contents: [
        {
          role: "user",
          parts: [part],
        },
      ],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  };

  const synthesizeViaInteractions = async (
    modelId: "gemini-3.8-flash-lite-tts" | "gemini-3.8-flash-tts"
  ) => {
    const interaction = await ai.interactions.create({
      model: modelId,
      input: [
        {
          type: "text",
          text: spokenText,
          annotations: [
            {
              type: "speech_metadata",
              style: styleDesc,
            },
          ],
        },
      ],
      response_format: { type: "audio" },
      generation_config: {
        speech_config: [
          {
            language: "en-US",
            voice,
          },
        ],
      },
    });
    return interaction.output_audio?.data;
  };

  try {
    let base64Audio: string | undefined;
    const attempts: Array<() => Promise<string | undefined>> = [
      () => synthesizeGenerateContent("gemini-3.8-flash-lite-tts", true),
      () => synthesizeGenerateContent("gemini-3.8-flash-tts", true),
      () => synthesizeViaInteractions("gemini-3.8-flash-lite-tts"),
      () => synthesizeGenerateContent("gemini-3.8-flash-lite-tts", false),
    ];

    let lastErr: unknown = null;
    for (const attempt of attempts) {
      try {
        base64Audio = await attempt();
        if (base64Audio) break;
      } catch (err) {
        lastErr = err;
      }
    }

    if (!base64Audio) {
      if (lastErr) {
        console.error("Gemini TTS error:", lastErr);
      }
      return res.status(502).json({ error: "Voice synthesis request failed." });
    }

    if (ttsCache.size >= MAX_TTS_CACHE) {
      const oldestKey = ttsCache.keys().next().value;
      if (oldestKey) ttsCache.delete(oldestKey);
    }
    ttsCache.set(cacheKey, base64Audio);

    return res.json({ audioBase64: base64Audio, mimeType: "audio/wav", cached: false });
  } catch (err) {
    console.error("Gemini TTS error:", err);
    return res.status(502).json({ error: "Voice synthesis request failed." });
  }
});

app.get("/api/contributions", async (_req, res) => {
  try {
    const submissions = await readSubmissions();
    return res.json({ submissions });
  } catch (err) {
    console.error("Read contributions error:", err);
    return res.status(500).json({ error: "Unable to read community contributions." });
  }
});

app.post("/api/contributions", async (req, res) => {
  const {
    contributorName,
    contributorAffiliation,
    category,
    title,
    community,
    description,
    dagbaniTerm,
    sourceAndPermission,
    mediaUrl,
  } = req.body ?? {};

  const allowedCategories = new Set([
    "photograph",
    "location",
    "event",
    "historical_record",
    "dagbani_expression",
    "architectural_reference",
  ]);

  if (
    typeof contributorName !== "string" ||
    !contributorName.trim() ||
    typeof title !== "string" ||
    !title.trim() ||
    typeof community !== "string" ||
    !community.trim() ||
    typeof description !== "string" ||
    !description.trim() ||
    typeof sourceAndPermission !== "string" ||
    !sourceAndPermission.trim() ||
    !allowedCategories.has(category)
  ) {
    return res.status(400).json({
      error: "Name, valid category, title, community, description, and source/permission are required.",
    });
  }

  try {
    const list = await readSubmissions();
    const newEntry: StoredSubmission = {
      id: `sub_${Date.now().toString(36)}`,
      contributorName: contributorName.trim().slice(0, 80),
      contributorAffiliation:
        typeof contributorAffiliation === "string" && contributorAffiliation.trim()
          ? contributorAffiliation.trim().slice(0, 100)
          : "Tamale Community Contributor",
      category,
      title: title.trim().slice(0, 140),
      community: community.trim().slice(0, 80),
      description: description.trim().slice(0, 1200),
      dagbaniTerm:
        typeof dagbaniTerm === "string" && dagbaniTerm.trim()
          ? dagbaniTerm.trim().slice(0, 120)
          : undefined,
      sourceAndPermission: sourceAndPermission.trim().slice(0, 240),
      mediaUrl:
        typeof mediaUrl === "string" && /^https?:\/\//i.test(mediaUrl.trim())
          ? mediaUrl.trim().slice(0, 300)
          : undefined,
      status: "pending_review",
      submittedAt: new Date().toISOString(),
    };
    const updated = [newEntry, ...list];
    await writeSubmissions(updated);
    return res.status(201).json({ submission: newEntry });
  } catch (err) {
    console.error("Create contribution error:", err);
    return res.status(500).json({ error: "Unable to save community submission." });
  }
});

app.patch("/api/contributions/:id/review", async (req, res) => {
  const { id } = req.params;
  const { status, reviewerNote } = req.body ?? {};
  if (status !== "approved" && status !== "needs_revision") {
    return res.status(400).json({ error: "Review status must be 'approved' or 'needs_revision'." });
  }

  try {
    const list = await readSubmissions();
    const idx = list.findIndex((s) => s.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Submission not found." });
    }
    const updatedItem: StoredSubmission = {
      ...list[idx],
      status,
      reviewerNote:
        typeof reviewerNote === "string" && reviewerNote.trim()
          ? reviewerNote.trim().slice(0, 240)
          : status === "approved"
          ? "Verified by Tamale 3D curator."
          : "Clarification requested before publishing.",
      reviewedAt: new Date().toISOString(),
    };
    list[idx] = updatedItem;
    await writeSubmissions(list);
    return res.json({ submission: updatedItem });
  } catch (err) {
    console.error("Review contribution error:", err);
    return res.status(500).json({ error: "Unable to update submission status." });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", game: "Tamale 3D" });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Tamale 3D server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
