import React, { useCallback, useEffect, useRef, useState } from "react";
import { Clock, Mic, Send, ShoppingBag, Sparkles, Square, Volume2, VolumeX, X } from "lucide-react";
import { DAGBANI_DATABASE } from "../data/dagbaniDatabase";
import {
  NPC_VOICE_PROFILES,
  selectLocalGhanaianSpeechVoice,
  toDagbaniSpokenText,
} from "../data/dagbaniVoices";
import {
  DialogueTurn,
  ErrandQuest,
  LanguageMode,
  NpcInteractionState,
  NpcProfile,
  NpcRuntimeSnapshot,
  TimePeriod,
} from "../types/game";

const STATE_LABELS: Record<NpcInteractionState, string> = {
  trading: "Trading",
  working: "Working",
  commuting: "In Transit",
  praying: "Praying",
  resting: "Resting at Home",
  socializing: "Socializing",
};

function formatSlotTime(mins: number): string {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

interface DialogueModalProps {
  npc: NpcProfile;
  npcRuntime?: NpcRuntimeSnapshot | null;
  languageMode: LanguageMode;
  showSubtitles: boolean;
  timePeriod: TimePeriod;
  friendshipLevel: number;
  availableErrand: ErrandQuest | null;
  onChangeLanguageMode: (mode: LanguageMode) => void;
  onToggleSubtitles: () => void;
  onClose: () => void;
  onOpenShop: (shopId: string) => void;
  onAcceptErrand: (errandId: string) => void;
  onLearnVocab: (vocabIds: string[]) => void;
  onIncreaseFriendship: (npcId: string) => void;
}

export const DialogueModal: React.FC<DialogueModalProps> = ({
  npc,
  npcRuntime,
  languageMode,
  showSubtitles,
  timePeriod,
  friendshipLevel,
  availableErrand,
  onChangeLanguageMode,
  onToggleSubtitles,
  onClose,
  onOpenShop,
  onAcceptErrand,
  onLearnVocab,
  onIncreaseFriendship,
}) => {
  const initialGreeting = npc.greetings[timePeriod];
  const [turns, setTurns] = useState<DialogueTurn[]>([
    {
      id: "greet-0",
      speaker: npc.name,
      dagbani: initialGreeting.dagbani,
      english: initialGreeting.english,
      mixed: initialGreeting.mixed,
      vocabTags: [timePeriod === "morning" ? "dasuba" : timePeriod === "afternoon" ? "wuntanga" : "zaawuni", "alaafee_beni"],
      source: "curated",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiStatusNote, setAiStatusNote] = useState<string | null>(null);
  const [inspectedVocabId, setInspectedVocabId] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speakingTurnId, setSpeakingTurnId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const stopSpeaking = useCallback(() => {
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      voiceAudioRef.current.src = "";
      voiceAudioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingTurnId(null);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  useEffect(() => {
    onLearnVocab([timePeriod === "morning" ? "dasuba" : timePeriod === "afternoon" ? "wuntanga" : "zaawuni"]);
  }, [timePeriod, onLearnVocab]);

  useEffect(() => {
    return () => {
      stopSpeaking();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [stopSpeaking]);

  const getTextForMode = useCallback(
    (turn: DialogueTurn) => {
      if (languageMode === "dagbani") return turn.dagbani;
      if (languageMode === "english") return turn.english;
      return turn.mixed;
    },
    [languageMode]
  );

  const voiceProfile = NPC_VOICE_PROFILES[npc.id] ?? {
    voiceName: "Kore" as const,
    gender: "female" as const,
    voiceTitle: "Dagomba Resident",
    style:
      "Authentic native Dagomba resident of Tamale, Northern Ghana, speaking warmly with Northern Ghanaian Dagbani accent.",
    pitch: 0.96,
    rate: 0.94,
  };

  const speakTurn = useCallback(
    async (turn: DialogueTurn, force = false) => {
      if (!force && !voiceEnabled) return;
      if (speakingTurnId === turn.id) {
        stopSpeaking();
        return;
      }

      stopSpeaking();
      const textToSpeak = getTextForMode(turn);
      if (!textToSpeak.trim()) return;

      setSpeakingTurnId(turn.id);

      try {
        const resp = await fetch("/api/npc/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: textToSpeak,
            voiceName: voiceProfile.voiceName,
            style: voiceProfile.style,
          }),
        });
        if (!resp.ok) {
          throw new Error("TTS unavailable");
        }
        const data = await resp.json();
        if (!data?.audioBase64) {
          throw new Error("Empty audio");
        }
        const audio = new Audio(`data:${data.mimeType || "audio/wav"};base64,${data.audioBase64}`);
        audio.volume = 0.88;
        voiceAudioRef.current = audio;
        audio.onended = () => {
          if (voiceAudioRef.current === audio) voiceAudioRef.current = null;
          setSpeakingTurnId(null);
        };
        audio.onerror = () => {
          if (voiceAudioRef.current === audio) voiceAudioRef.current = null;
          setSpeakingTurnId(null);
        };
        await audio.play();
      } catch {
        // Fallback speaks the active Dagbani/Mixed line with phonetic Dagbani pronunciation & local voice pitch/rate
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          const spokenPhonetic = toDagbaniSpokenText(textToSpeak);
          const utter = new SpeechSynthesisUtterance(spokenPhonetic);
          const availableVoices = window.speechSynthesis.getVoices();
          const chosenVoice = selectLocalGhanaianSpeechVoice(
            availableVoices,
            voiceProfile.gender === "female"
          );
          if (chosenVoice) {
            utter.voice = chosenVoice;
            utter.lang = chosenVoice.lang;
          }
          utter.pitch = voiceProfile.pitch;
          utter.rate = voiceProfile.rate;
          utter.onend = () => setSpeakingTurnId(null);
          utter.onerror = () => setSpeakingTurnId(null);
          window.speechSynthesis.speak(utter);
        } else {
          setSpeakingTurnId(null);
        }
      }
    },
    [
      getTextForMode,
      speakingTurnId,
      stopSpeaking,
      voiceEnabled,
      voiceProfile.gender,
      voiceProfile.pitch,
      voiceProfile.rate,
      voiceProfile.style,
      voiceProfile.voiceName,
    ]
  );

  const handleTopicClick = (topicId: string) => {
    const topic = npc.topics.find((t) => t.id === topicId);
    if (!topic) return;

    const playerTurn: DialogueTurn = {
      id: `p-${Date.now()}`,
      speaker: "You",
      dagbani: topic.dagbaniPrompt,
      english: topic.label,
      mixed: topic.dagbaniPrompt,
      source: "curated",
    };
    const npcTurn: DialogueTurn = {
      id: `n-${Date.now() + 1}`,
      speaker: npc.name,
      dagbani: topic.response.dagbani,
      english: topic.response.english,
      mixed: topic.response.mixed,
      vocabTags: topic.vocabUsed,
      source: "curated",
    };
    setTurns((prev) => [...prev, playerTurn, npcTurn]);
    onLearnVocab(topic.vocabUsed);
    onIncreaseFriendship(npc.id);
    if (voiceEnabled) {
      void speakTurn(npcTurn);
    }
  };

  const buildOfflineFallback = (msg: string): DialogueTurn => {
    const lower = msg.toLowerCase();
    if (lower.includes("dasuba") || lower.includes("morning") || lower.includes("antire")) {
      return {
        id: `off-${Date.now()}`,
        speaker: npc.name,
        dagbani: "Antire! Alaafee beni. M'paɣiya ni a puhi ma.",
        english: "Peace upon you! I am well. Thank you for greeting me warmly.",
        mixed: "Antire! Alaafee beni — m'paɣiya for greeting me in Dagbani!",
        vocabTags: ["antire", "alaafee_beni", "mpagiya"],
        source: "offline",
      };
    }
    if (lower.includes("price") || lower.includes("ala") || lower.includes("boogima") || lower.includes("buy")) {
      return {
        id: `off-${Date.now()}`,
        speaker: npc.name,
        dagbani: "Di daa nyɛla laɣiri bela. A yi yɛli 'Boogima', ti ni kpaɣi taba.",
        english: "Prices here in Tamale are fair. When you say 'Boogima', we negotiate warmly.",
        mixed: "Di daa is fair! Say 'Boogima!' with a smile and we always find a friendly price.",
        vocabTags: ["di_daa_nyela_ala", "boogima", "lagiri"],
        source: "offline",
      };
    }
    return {
      id: `off-${Date.now()}`,
      speaker: npc.name,
      dagbani: "M'paɣiya, n zɔri! Zɔri suŋ gari laɣiri.",
      english: "Thank you, my friend! Here in Tamale, a good friend is worth more than money.",
      mixed: "M'paɣiya, n zɔri! As elders say in Tamale: Zɔri suŋ gari laɣiri.",
      vocabTags: ["mpagiya", "zori", "proverb_friend"],
      source: "offline",
    };
  };

  const sendMessageText = useCallback(
    async (rawText: string) => {
      const trimmed = rawText.trim();
      if (!trimmed || loadingAi) return;

      const playerTurn: DialogueTurn = {
        id: `u-${Date.now()}`,
        speaker: "You",
        dagbani: trimmed,
        english: trimmed,
        mixed: trimmed,
      };
      setTurns((prev) => [...prev, playerTurn]);
      setInputText("");
      setLoadingAi(true);
      setAiStatusNote(null);

      try {
        const resp = await fetch("/api/npc/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            npcName: npc.name,
            npcRole: npc.role,
            npcDistrict: npcRuntime?.district ?? npc.district,
            npcPersonality: npcRuntime
              ? `${npc.personality} Currently ${STATE_LABELS[npcRuntime.state]}: ${npcRuntime.activityLabel}.`
              : npc.personality,
            languageMode,
            timePeriod,
            playerMessage: trimmed,
            friendshipLevel,
            history: turns.slice(-4).map((t) => ({ speaker: t.speaker, text: getTextForMode(t) })),
          }),
        });

        if (!resp.ok) {
          throw new Error("AI endpoint unavailable");
        }

        const data = await resp.json();
        const aiTurn: DialogueTurn = {
          id: `ai-${Date.now()}`,
          speaker: npc.name,
          dagbani: data.replyDagbani,
          english: data.replyEnglish,
          mixed: data.replyMixed,
          vocabTags: data.vocabularyUsed,
          source: "gemini",
        };
        setTurns((prev) => [...prev, aiTurn]);
        onIncreaseFriendship(npc.id);
        if (voiceEnabled) {
          void speakTurn(aiTurn);
        }
      } catch {
        setAiStatusNote("Using verified offline Dagbani dialogue (AI chat unavailable).");
        const fallbackTurn = buildOfflineFallback(trimmed);
        setTurns((prev) => [...prev, fallbackTurn]);
        onIncreaseFriendship(npc.id);
        if (voiceEnabled) {
          void speakTurn(fallbackTurn);
        }
      } finally {
        setLoadingAi(false);
      }
    },
    [
      friendshipLevel,
      getTextForMode,
      languageMode,
      loadingAi,
      npc.district,
      npc.id,
      npc.name,
      npc.personality,
      npc.role,
      npcRuntime,
      onIncreaseFriendship,
      speakTurn,
      timePeriod,
      turns,
      voiceEnabled,
    ]
  );

  const handleSendFreeChat = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessageText(inputText);
  };

  const handleToggleMic = async () => {
    if (loadingAi || transcribing) return;

    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      // Browser Web Speech API fallback
      const SpeechRec =
        (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown })
          .SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;

      if (!SpeechRec) {
        setAiStatusNote("Microphone speech input is not supported in this browser.");
        return;
      }

      const rec = new SpeechRec() as {
        lang: string;
        interimResults: boolean;
        onresult: (ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
        onerror: () => void;
        onend: () => void;
        start: () => void;
      };
      rec.lang = "en-GH";
      rec.interimResults = false;
      setIsRecording(true);
      setAiStatusNote("Listening via browser speech recognition...");
      rec.onresult = (ev) => {
        const spoken = ev.results?.[0]?.[0]?.transcript?.trim();
        if (spoken) {
          void sendMessageText(spoken);
        }
      };
      rec.onerror = () => {
        setIsRecording(false);
        setAiStatusNote("Could not capture voice. Please type or retry mic.");
      };
      rec.onend = () => setIsRecording(false);
      rec.start();
      return;
    }

    try {
      stopSpeaking();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;

        const mime = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mime });
        chunksRef.current = [];
        if (blob.size < 250) {
          setAiStatusNote("No voice audio detected. Hold mic longer and speak clearly.");
          return;
        }

        setTranscribing(true);
        setAiStatusNote("Transcribing your voice...");
        try {
          const dataUrl: string = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(new Error("Read failed"));
            reader.readAsDataURL(blob);
          });

          const resp = await fetch("/api/npc/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audioBase64: dataUrl, mimeType: mime }),
          });
          if (!resp.ok) {
            throw new Error("Transcription unavailable");
          }
          const json = await resp.json();
          const transcript = String(json.transcript || "").trim();
          if (transcript) {
            setAiStatusNote(null);
            await sendMessageText(transcript);
          } else {
            setAiStatusNote("Did not catch clear words — please speak again or type.");
          }
        } catch {
          setAiStatusNote("Voice transcription unavailable right now — please type your message.");
        } finally {
          setTranscribing(false);
        }
      };

      recorder.start();
      setIsRecording(true);
      setAiStatusNote("Listening... click Stop Mic when finished speaking.");
    } catch {
      setIsRecording(false);
      setAiStatusNote("Microphone permission denied or unavailable. You can type your message below.");
    }
  };

  const inspectedEntry = inspectedVocabId
    ? DAGBANI_DATABASE.find((v) => v.id === inspectedVocabId)
    : null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 p-4">
      <div className="w-full max-w-2xl bg-[#171411] border border-white/15 rounded-xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#f8f5ef]">{npc.name}</h2>
            <div className="text-xs text-[#b5ada0]">
              {npc.role} · {npc.dagbaniRole} · {npcRuntime?.district ?? npc.district} · Friendship {friendshipLevel}
            </div>
            {npcRuntime && (
              <div className="text-xs text-amber-300/90 mt-1 flex flex-wrap items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  {STATE_LABELS[npcRuntime.state]} · {npcRuntime.activityLabel}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#0f0d0b] border border-white/10 rounded-md p-0.5">
              {(["dagbani", "mixed", "english"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onChangeLanguageMode(m)}
                  className={`px-2 py-1 text-xs rounded capitalize cursor-pointer ${
                    languageMode === m
                      ? "bg-amber-500 text-[#12100e] font-semibold"
                      : "text-[#bfb7aa] hover:text-white"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#bfb7aa] hover:text-white rounded-md hover:bg-white/10 cursor-pointer"
              aria-label="Close conversation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Audio, Schedule & Subtitle Notice Bar */}
        <div className="px-6 py-2 bg-[#120f0d] border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-[#a39b8e]">
          <button
            type="button"
            onClick={() => {
              const next = !voiceEnabled;
              setVoiceEnabled(next);
              if (!next) stopSpeaking();
            }}
            className="flex items-center gap-1.5 hover:text-amber-300 transition-colors cursor-pointer"
          >
            {voiceEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-[#8c8478]" />
            )}
            <span>
              {voiceEnabled
                ? `Dagbani voice · ${voiceProfile.voiceTitle}`
                : "Voice replies muted · Click Listen on any turn"}
            </span>
          </button>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowSchedule((s) => !s)}
              className="text-[#d4cdc2] hover:text-amber-300 font-medium cursor-pointer"
            >
              {showSchedule ? "Hide Routine" : "Daily Routine"}
            </button>
            <button
              type="button"
              onClick={onToggleSubtitles}
              className="text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
            >
              {showSubtitles ? "Hide Subtitles" : "Show Subtitles"}
            </button>
          </div>
        </div>

        {/* Optional Daily Schedule Drawer */}
        {showSchedule && (
          <div className="px-6 py-3 bg-[#14110f] border-b border-white/10 space-y-1.5 max-h-40 overflow-y-auto">
            <div className="text-[11px] font-semibold text-[#ede8de]">
              Daily Tamale Routine · Home: {npc.homeDistrict}
            </div>
            {npc.schedule.map((slot) => {
              const isActive = npcRuntime?.destinationLabel === slot.destinationLabel &&
                (npcRuntime.state === slot.interactionState || (npcRuntime.state === "commuting" && slot.interactionState === "commuting"));
              return (
                <div
                  key={slot.id}
                  className={`text-xs flex flex-wrap justify-between gap-2 py-1 border-b border-white/5 last:border-b-0 ${
                    isActive ? "text-amber-300 font-medium" : "text-[#a8a092]"
                  }`}
                >
                  <span>
                    {formatSlotTime(slot.startMinute)}–{formatSlotTime(slot.endMinute)} · {slot.destinationLabel}
                  </span>
                  <span>{STATE_LABELS[slot.interactionState]}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Conversation Feed */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {turns.map((turn) => {
            const isPlayer = turn.speaker === "You";
            return (
              <div
                key={turn.id}
                className={`flex flex-col ${isPlayer ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-2 text-[11px] text-[#9c9487] mb-1">
                  <span>
                    {turn.speaker}
                    {turn.source === "gemini" && " · AI Conversational"}
                  </span>
                  {!isPlayer && (
                    <button
                      type="button"
                      onClick={() => void speakTurn(turn, true)}
                      className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 cursor-pointer"
                      title={speakingTurnId === turn.id ? "Stop voice" : "Listen to voice reply"}
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>{speakingTurnId === turn.id ? "Stop" : "Listen"}</span>
                    </button>
                  )}
                </div>
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                    isPlayer
                      ? "bg-amber-600/90 text-[#12100e] font-medium"
                      : "bg-[#221d18] text-[#f5f2eb] border border-white/10"
                  }`}
                >
                  <div>{getTextForMode(turn)}</div>
                  {!isPlayer && showSubtitles && languageMode !== "english" && (
                    <div className="mt-2 pt-2 border-t border-white/10 text-xs text-[#c5bdb0]">
                      Subtitle: {turn.english}
                    </div>
                  )}
                  {!isPlayer && turn.vocabTags && turn.vocabTags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {turn.vocabTags.map((vid) => {
                        const entry = DAGBANI_DATABASE.find((d) => d.id === vid);
                        if (!entry) return null;
                        return (
                          <button
                            key={vid}
                            type="button"
                            onClick={() => setInspectedVocabId(vid)}
                            className="text-[11px] px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 cursor-pointer"
                          >
                            {entry.dagbani}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {loadingAi && (
            <div className="text-xs text-[#a39b8e]">{npc.name} is replying...</div>
          )}
        </div>

        {/* Inline Vocabulary Inspector */}
        {inspectedEntry && (
          <div className="mx-6 mb-3 p-3 rounded-lg bg-[#231e19] border border-amber-500/30 flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-amber-300">
                {inspectedEntry.dagbani} — {inspectedEntry.english}
              </div>
              <div className="text-xs text-[#cfc8bc] mt-0.5">
                Pronunciation: {inspectedEntry.phoneticGuide} · {inspectedEntry.usageNote}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setInspectedVocabId(null)}
              className="text-xs text-[#9c9487] hover:text-white cursor-pointer"
            >
              Close
            </button>
          </div>
        )}

        {aiStatusNote && (
          <div className="px-6 pb-2 text-[11px] text-amber-300/90">{aiStatusNote}</div>
        )}

        {/* Quick Cultural Actions, Shop & Errands */}
        <div className="px-6 py-3 border-t border-white/10 bg-[#13100e] space-y-2.5">
          <div className="flex flex-wrap gap-2">
            {npc.topics.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => handleTopicClick(topic.id)}
                className="px-3 py-1.5 text-xs font-medium bg-[#241f1a] hover:bg-[#302922] text-[#ede8de] border border-white/10 rounded-md transition-colors cursor-pointer"
              >
                {topic.label}
              </button>
            ))}

            {npc.shopId && (npcRuntime ? npcRuntime.shopOpen : true) && (
              <button
                type="button"
                onClick={() => onOpenShop(npc.shopId!)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-[#12100e] rounded-md transition-colors cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Open Market Stall</span>
              </button>
            )}

            {npc.shopId && npcRuntime && !npcRuntime.shopOpen && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#1d1915] text-[#9c9487] border border-white/10 rounded-md">
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Stall closed while {STATE_LABELS[npcRuntime.state].toLowerCase()}</span>
              </span>
            )}

            {availableErrand && !availableErrand.active && !availableErrand.completed && (
              <button
                type="button"
                onClick={() => onAcceptErrand(availableErrand.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Accept Errand (+GH₵ {availableErrand.rewardCedis})</span>
              </button>
            )}
          </div>

          {/* Free Voice & Text Conversation Input */}
          <form onSubmit={handleSendFreeChat} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleToggleMic()}
              disabled={loadingAi || transcribing}
              title={isRecording ? "Stop recording and send" : "Speak using microphone"}
              className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                isRecording
                  ? "bg-red-600 hover:bg-red-500 text-white"
                  : "bg-[#241f1a] hover:bg-[#302922] text-amber-300 border border-amber-500/35"
              } disabled:opacity-40`}
            >
              {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{isRecording ? "Stop" : transcribing ? "..." : "Mic"}</span>
            </button>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Speak with Mic or type in Dagbani/English to ${npc.name}...`}
              className="flex-1 bg-[#0e0c0a] border border-white/15 rounded-lg px-3.5 py-2 text-sm text-[#f8f5ef] placeholder-[#7c7468] focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={loadingAi || transcribing || !inputText.trim()}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-[#12100e] font-semibold text-sm rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
