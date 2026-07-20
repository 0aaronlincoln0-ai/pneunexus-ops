import {
  AlertTriangle,
  AudioLines,
  Bot,
  Camera,
  Check,
  ChevronRight,
  History,
  Keyboard,
  LoaderCircle,
  Mic,
  MicOff,
  MessageSquarePlus,
  Send,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { useAuth } from "../auth";
import * as api from "../lib/api";
import type { DiagnosticConversationMessage, DiagnosticTurnResponse } from "../lib/diagnostic-ai";
import {
  diagnosticHistoryTitle,
  loadDiagnosticHistory,
  upsertDiagnosticHistory,
  type DiagnosticHistoryEntry,
} from "../lib/diagnostic-history";
import { cn } from "../lib/utils";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";

interface VoiceDiagnosticAssistantProps {
  deviceContext?: string;
}

type AssistantPhase = "ready" | "listening" | "thinking" | "speaking";

export function VoiceDiagnosticAssistant({ deviceContext }: VoiceDiagnosticAssistantProps) {
  const { csrfToken } = useAuth();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<DiagnosticConversationMessage[]>([]);
  const [result, setResult] = useState<DiagnosticTurnResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<AssistantPhase>("ready");
  const [photo, setPhoto] = useState<{ dataUrl: string; name: string } | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [sessionId, setSessionId] = useState<string>(createSessionId);
  const [guideId, setGuideId] = useState<string | undefined>();
  const [history, setHistory] = useState<DiagnosticHistoryEntry[]>(loadDiagnosticHistory);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement | null>(null);
  const conversationEndRef = useRef<HTMLDivElement | null>(null);
  const sessionCreatedAtRef = useRef(new Date().toISOString());
  const responseSequenceRef = useRef(0);

  const busy = phase === "thinking";
  const started = messages.length > 0 || result !== null;

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, phase]);

  useEffect(() => {
    if (!messages.length) return;
    const now = new Date().toISOString();
    setHistory(
      upsertDiagnosticHistory({
        id: sessionId,
        createdAt: sessionCreatedAtRef.current,
        updatedAt: now,
        title: diagnosticHistoryTitle(messages),
        ...(deviceContext ? { deviceContext } : {}),
        ...(guideId ? { guideId } : {}),
        messages,
      }),
    );
  }, [deviceContext, guideId, messages, sessionId]);

  useEffect(
    () => () => {
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    },
    [],
  );

  function speakText(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    utterance.pitch = 0.96;
    utterance.onstart = () => setPhase("speaking");
    utterance.onend = () => setPhase("ready");
    utterance.onerror = () => setPhase("ready");
    window.speechSynthesis.speak(utterance);
  }

  async function typeAssistantResponse(text: string) {
    const responseSequence = ++responseSequenceRef.current;
    setMessages((current) => [...current, { role: "assistant", text: "" }]);
    for (let length = 4; length < text.length; length += 4) {
      await new Promise((resolve) => window.setTimeout(resolve, 14));
      if (responseSequence !== responseSequenceRef.current) return;
      setMessages((current) => {
        const last = current.at(-1);
        if (!last || last.role !== "assistant") return current;
        return [...current.slice(0, -1), { ...last, text: text.slice(0, length) }];
      });
    }
    if (responseSequence !== responseSequenceRef.current) return;
    setMessages((current) => {
      const last = current.at(-1);
      if (!last || last.role !== "assistant") return current;
      return [...current.slice(0, -1), { ...last, text }];
    });
  }

  async function sendMessage(message: string) {
    const cleaned = message.trim();
    if (!cleaned || busy) return;
    if (!csrfToken) {
      setError(
        "Sign in to an authorized Resovii workspace before starting a live diagnostic session.",
      );
      return;
    }
    const conversation = messages.slice(-8);
    setMessages((current) => [...current, { role: "user", text: cleaned }]);
    setInput("");
    setError(null);
    setPhase("thinking");
    try {
      const nextResult = await api.diagnose(
        {
          message: cleaned,
          ...(guideId ? { guideId } : {}),
          completedStepIndexes: [],
          conversation,
          ...(deviceContext ? { deviceContext } : {}),
          ...(photo ? { imageDataUrl: photo.dataUrl } : {}),
        },
        csrfToken,
      );
      setResult(nextResult);
      setGuideId(nextResult.recommendedGuideId);
      setPhoto(null);
      if (autoSpeak) speakText(nextResult.speech);
      else setPhase("ready");
      await typeAssistantResponse(nextResult.speech);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Voice Assist could not respond.");
      setPhase("ready");
    }
  }

  function toggleListening() {
    if (phase === "listening") {
      recognitionRef.current?.stop();
      setPhase("ready");
      return;
    }
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      setError(
        "Voice input is not available in this browser. You can type the same message below.",
      );
      textInputRef.current?.focus();
      return;
    }
    window.speechSynthesis?.cancel();
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setPhase("ready");
      if (transcript) void sendMessage(transcript);
    };
    recognition.onerror = () => {
      setPhase("ready");
      setError("I could not hear that clearly. Move closer, tap the microphone, and try again.");
    };
    recognition.onend = () => setPhase((current) => (current === "listening" ? "ready" : current));
    recognitionRef.current = recognition;
    setError(null);
    setPhase("listening");
    recognition.start();
  }

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setPhoto({ dataUrl: await compressPhoto(file), name: file.name });
      setError(null);
    } catch {
      setError("That photo could not be prepared. Try a JPEG, PNG, or WebP image.");
    }
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  function startNewConversation() {
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
    responseSequenceRef.current += 1;
    setMessages([]);
    setResult(null);
    setPhoto(null);
    setInput("");
    setError(null);
    setPhase("ready");
    setGuideId(undefined);
    setSessionId(createSessionId());
    sessionCreatedAtRef.current = new Date().toISOString();
  }

  function resumeConversation(entry: DiagnosticHistoryEntry) {
    window.speechSynthesis?.cancel();
    responseSequenceRef.current += 1;
    setSessionId(entry.id);
    sessionCreatedAtRef.current = entry.createdAt;
    setMessages(entry.messages);
    setGuideId(entry.guideId);
    setResult(null);
    setPhoto(null);
    setInput("");
    setError(null);
    setPhase("ready");
  }

  function describeDifferentResult() {
    setInput("The result was different: ");
    requestAnimationFrame(() => {
      textInputRef.current?.focus();
      textInputRef.current?.setSelectionRange(26, 26);
    });
  }

  return (
    <Card className="voice-assist-shell mb-7 overflow-hidden" data-phase={phase}>
      <div className="border-b border-white/[0.07] px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <AssistantOrb phase={phase} />
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">
                  Pocket Technician
                </h2>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.07] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-300">
                  Ready to help
                </span>
              </div>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-400">
                Tell us what you see. We will walk through one safe check at a time and wait for
                your answer.
              </p>
            </div>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
            <button
              type="button"
              aria-pressed={autoSpeak}
              onClick={() => {
                setAutoSpeak((value) => !value);
                if (autoSpeak) window.speechSynthesis?.cancel();
              }}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 text-sm font-semibold text-slate-300 transition hover:border-white/[0.16] hover:bg-white/[0.05] sm:px-3.5"
            >
              {autoSpeak ? <Volume2 size={18} /> : <VolumeX size={18} />}
              Read aloud {autoSpeak ? "on" : "off"}
            </button>
            {started && (
              <button
                type="button"
                onClick={startNewConversation}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-400 transition hover:bg-white/[0.05] hover:text-white sm:px-3.5"
              >
                <MessageSquarePlus size={17} /> New conversation
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-3" aria-label="How Pocket Technician works">
          <HowItWorksStep
            number="1"
            icon={AudioLines}
            label="Describe the problem"
            active={!started}
          />
          <HowItWorksStep
            number="2"
            icon={ShieldCheck}
            label="Follow one safe check"
            active={started}
          />
          <HowItWorksStep
            number="3"
            icon={Check}
            label="Report what happened"
            active={Boolean(result)}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)]">
        <section className="p-4 sm:p-7" aria-label="Voice Assist conversation">
          <div className="voice-conversation flex min-h-[300px] flex-col rounded-2xl border border-white/[0.07] bg-[#070c12]/70">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    phase === "listening" && "animate-pulse bg-red-400",
                    phase === "thinking" && "animate-pulse bg-amber-300",
                    phase === "speaking" && "animate-pulse bg-teal-300",
                    phase === "ready" && "bg-emerald-400",
                  )}
                />
                <p className="text-sm font-semibold text-slate-200">{phaseLabel(phase)}</p>
              </div>
              <p className="hidden text-xs text-slate-600 sm:block">
                {guideId
                  ? "A reviewed procedure is matched to this case"
                  : "Procedure match begins with your report"}
              </p>
            </div>

            <div
              className="flex-1 space-y-4 overflow-y-auto p-4 sm:max-h-[410px] sm:p-5"
              aria-live="polite"
            >
              {!started && (
                <div className="voice-welcome mx-auto max-w-lg py-4 text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-teal-300/15 bg-teal-300/[0.06] text-teal-300">
                    <Sparkles size={21} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">What is happening?</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Describe the observation in your own words. Include the device, any fault text,
                    and what the carrier or system did.
                  </p>
                </div>
              )}

              {messages.map((message, index) => (
                <ConversationBubble
                  key={`${message.role}-${index}`}
                  message={message}
                  {...(message.role === "assistant"
                    ? { onRepeat: () => speakText(message.text) }
                    : {})}
                />
              ))}

              {phase === "thinking" && (
                <div className="voice-message-enter flex items-end gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-teal-300/15 bg-teal-300/[0.06] text-teal-300">
                    <Bot size={17} />
                  </div>
                  <div className="rounded-2xl rounded-bl-md border border-white/[0.07] bg-white/[0.035] px-4 py-3.5">
                    <div
                      className="flex items-center gap-1.5"
                      aria-label="Voice Assist is thinking"
                    >
                      <span className="voice-thinking-dot" />
                      <span className="voice-thinking-dot" />
                      <span className="voice-thinking-dot" />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Checking the approved procedures…</p>
                  </div>
                </div>
              )}
              <div ref={conversationEndRef} />
            </div>

            {photo && (
              <div className="mx-4 mb-3 flex items-center gap-3 rounded-xl border border-teal-300/15 bg-teal-300/[0.035] p-2.5 sm:mx-5">
                <img
                  src={photo.dataUrl}
                  alt="Equipment evidence preview"
                  className="h-16 w-16 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-200">{photo.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Photo will be included with your next message
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Remove attached photo"
                  onClick={() => setPhoto(null)}
                  className="grid h-11 w-11 place-items-center rounded-xl text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            <div className="voice-composer border-t border-white/[0.06] p-3 sm:p-4">
              <div className="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
                <button
                  type="button"
                  disabled={busy}
                  onClick={toggleListening}
                  aria-label={phase === "listening" ? "Stop listening" : "Tap to speak"}
                  className={cn(
                    "voice-mic-button group flex min-h-16 items-center justify-center gap-3 rounded-2xl border px-5 text-base font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/70 sm:min-w-44",
                    phase === "listening"
                      ? "border-red-300/35 bg-red-400/[0.12] text-red-100"
                      : "border-teal-300/25 bg-teal-300/[0.09] text-teal-100 hover:border-teal-300/40 hover:bg-teal-300/[0.14]",
                  )}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-black/20">
                    {phase === "listening" ? <MicOff size={22} /> : <Mic size={22} />}
                  </span>
                  <span>{phase === "listening" ? "Stop listening" : "Tap to talk"}</span>
                </button>

                <div className="relative">
                  <Keyboard className="absolute left-4 top-5 text-slate-600" size={18} />
                  <textarea
                    ref={textInputRef}
                    rows={2}
                    value={input}
                    disabled={busy}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Or type what you see…"
                    aria-label="Type a message to Voice Assist"
                    className="min-h-16 w-full resize-none rounded-2xl border border-white/[0.09] bg-white/[0.03] py-4 pl-11 pr-14 text-base leading-6 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-teal-300/35 focus:ring-2 focus:ring-teal-300/10 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    aria-label="Send typed message"
                    disabled={!input.trim() || busy}
                    onClick={() => void sendMessage(input)}
                    className="absolute bottom-2.5 right-2.5 grid h-11 w-11 place-items-center rounded-xl bg-teal-400 text-[#04100f] transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:bg-white/[0.05] disabled:text-slate-700"
                  >
                    {busy ? (
                      <LoaderCircle className="animate-spin" size={19} />
                    ) : (
                      <Send size={19} />
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => photoInputRef.current?.click()}
                  className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/[0.09] bg-white/[0.025] px-4 text-sm font-semibold text-slate-300 transition hover:border-white/[0.16] hover:bg-white/[0.05] sm:min-h-16 sm:flex-col sm:gap-1"
                >
                  <Camera size={20} />
                  <span>Add photo</span>
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="hidden"
                  onChange={(event) => void handlePhoto(event)}
                />
              </div>
              <div className="mt-3 flex items-start gap-2 px-1 text-xs leading-5 text-slate-600">
                <ShieldCheck className="mt-0.5 shrink-0 text-teal-300/60" size={15} />
                Equipment information only. Do not include patients, specimens, medications, labels,
                or other private health information.
              </div>
            </div>
          </div>
          {error && (
            <div
              className="voice-message-enter mt-3 flex items-start gap-3 rounded-xl border border-red-300/20 bg-red-300/[0.06] p-4 text-sm leading-6 text-red-100"
              role="alert"
            >
              <AlertTriangle className="mt-0.5 shrink-0" size={19} />
              <div>
                <p className="font-semibold">Voice Assist needs your attention</p>
                <p className="mt-0.5 text-red-200/75">{error}</p>
              </div>
            </div>
          )}
        </section>

        <aside
          className="border-t border-white/[0.07] bg-white/[0.015] p-5 lg:border-l lg:border-t-0 sm:p-7"
          aria-label="Diagnostic history and current guidance"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-teal-300/70">
                Diagnostic history
              </p>
              <p className="mt-1 text-sm text-slate-500">Resume a recent field conversation</p>
            </div>
          </div>

          <ConversationHistory
            history={history}
            activeId={sessionId}
            onResume={resumeConversation}
          />

          <div className="my-6 border-t border-white/[0.07]" />

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-teal-300/70">
                Your next step
              </p>
              <p className="mt-1 text-sm text-slate-500">Only one action at a time</p>
            </div>
            {result && (
              <button
                type="button"
                onClick={() => speakText(result.speech)}
                className="grid h-12 w-12 place-items-center rounded-xl border border-white/[0.09] bg-white/[0.03] text-slate-300 transition hover:border-teal-300/25 hover:text-teal-200"
                aria-label="Repeat the current instruction aloud"
              >
                <Volume2 size={20} />
              </button>
            )}
          </div>

          {phase === "thinking" ? (
            <ThinkingPanel />
          ) : result ? (
            <CurrentStep
              result={result}
              onExpected={() => void sendMessage("The check matched the expected result.")}
              onDifferent={describeDifferentResult}
              onCannotComplete={() =>
                void sendMessage(
                  "I cannot safely complete this check. Tell me whether I should stop and escalate.",
                )
              }
            />
          ) : (
            <ReadyPanel />
          )}
        </aside>
      </div>
    </Card>
  );
}

function AssistantOrb({ phase }: { phase: AssistantPhase }) {
  return (
    <div className="voice-orb" data-phase={phase} aria-hidden="true">
      <div className="voice-orb-ring voice-orb-ring-one" />
      <div className="voice-orb-ring voice-orb-ring-two" />
      <div className="voice-orb-core">
        {phase === "listening" ? (
          <Mic size={23} />
        ) : phase === "thinking" ? (
          <Sparkles size={22} />
        ) : (
          <Bot size={23} />
        )}
      </div>
    </div>
  );
}

function HowItWorksStep({
  number,
  icon: Icon,
  label,
  active,
}: {
  number: string;
  icon: typeof AudioLines;
  label: string;
  active: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-12 items-center gap-3 rounded-xl border px-3.5 transition",
        active
          ? "border-teal-300/20 bg-teal-300/[0.055] text-slate-200"
          : "border-white/[0.055] bg-white/[0.015] text-slate-500",
      )}
    >
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-black/20 text-xs font-bold text-teal-300">
        {number}
      </span>
      <Icon size={16} />
      <span className="text-xs font-semibold">{label}</span>
    </div>
  );
}

function ConversationBubble({
  message,
  onRepeat,
}: {
  message: DiagnosticConversationMessage;
  onRepeat?: () => void;
}) {
  const assistant = message.role === "assistant";
  return (
    <div className={cn("voice-message-enter flex items-end gap-3", !assistant && "justify-end")}>
      {assistant && (
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-teal-300/15 bg-teal-300/[0.06] text-teal-300">
          <Bot size={17} />
        </div>
      )}
      <div className={cn("max-w-[88%]", !assistant && "text-right")}>
        <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
          {assistant ? "Voice Assist" : "You"}
        </p>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-left text-sm leading-6",
            assistant
              ? "rounded-bl-md border border-white/[0.07] bg-white/[0.04] text-slate-300"
              : "rounded-br-md bg-teal-300/[0.13] text-teal-50 ring-1 ring-inset ring-teal-300/15",
          )}
        >
          {message.text}
        </div>
        {assistant && onRepeat && (
          <button
            type="button"
            onClick={onRepeat}
            className="mt-1.5 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-slate-500 transition hover:bg-white/[0.04] hover:text-slate-300"
          >
            <Volume2 size={14} /> Hear again
          </button>
        )}
      </div>
    </div>
  );
}

function ThinkingPanel() {
  return (
    <div className="voice-step-enter mt-8 text-center">
      <div className="voice-thinking-orbit mx-auto">
        <Sparkles size={24} />
      </div>
      <p className="mt-5 text-lg font-semibold text-white">Checking the best next step</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
        Voice Assist is comparing your observation with the approved troubleshooting procedures.
      </p>
      <div className="mx-auto mt-6 h-1.5 max-w-xs overflow-hidden rounded-full bg-white/[0.05]">
        <div className="voice-progress-scan h-full w-1/3 rounded-full bg-teal-300" />
      </div>
    </div>
  );
}

function CurrentStep({
  result,
  onExpected,
  onDifferent,
  onCannotComplete,
}: {
  result: DiagnosticTurnResponse;
  onExpected(): void;
  onDifferent(): void;
  onCannotComplete(): void;
}) {
  return (
    <div className="voice-step-enter mt-6">
      <div className="flex flex-wrap gap-2">
        <Badge>{`${result.confidence} confidence`}</Badge>
        <Badge>{result.mode === "ai-gateway" ? "AI guided" : "Local preview"}</Badge>
      </div>
      <p className="mt-5 text-sm leading-6 text-slate-400">{result.summary}</p>

      {result.serviceKnowledge.length > 0 && (
        <div className="mt-5 rounded-2xl border border-indigo-300/15 bg-indigo-300/[0.045] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-indigo-200">
            Related field resolutions
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Technician-recorded experience. Review it alongside the approved procedure; it does not
            replace the safety gate.
          </p>
          <div className="mt-3 space-y-3">
            {result.serviceKnowledge.map((record) => (
              <div
                key={record.id}
                className="rounded-xl border border-white/[0.07] bg-black/10 p-3"
              >
                <p className="text-sm font-semibold text-slate-200">{record.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {record.equipment} | {record.location} | {record.status}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-400">{record.resolution}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.safetyStop && (
        <div className="mt-5 rounded-2xl border border-red-300/25 bg-red-300/[0.07] p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-red-100">
            <AlertTriangle size={19} /> Stop before continuing
          </div>
          <p className="mt-2 text-sm leading-6 text-red-200/75">{result.safetyMessage}</p>
        </div>
      )}

      {result.nextStep ? (
        <div className="mt-5 rounded-2xl border border-teal-300/20 bg-teal-300/[0.045] p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-300 text-sm font-black text-[#04100f]">
              1
            </span>
            <div>
              <p className="text-lg font-semibold leading-6 text-white">{result.nextStep.title}</p>
              <p className="mt-3 text-base leading-7 text-slate-300">
                {result.nextStep.instruction}
              </p>
            </div>
          </div>
          <div className="mt-5 border-t border-teal-300/10 pt-4">
            <p className="text-xs font-bold uppercase tracking-[0.13em] text-teal-300/75">
              What you should see
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-400">{result.nextStep.expected}</p>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-5 text-sm leading-6 text-slate-300">
          {result.followUpQuestion}
        </div>
      )}

      {result.nextStep && (
        <div className="mt-6">
          <p className="text-sm font-semibold text-slate-200">What happened?</p>
          <div className="mt-3 grid gap-2">
            <button
              type="button"
              onClick={onExpected}
              className="group flex min-h-14 items-center gap-3 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.045] px-4 text-left text-sm font-semibold text-slate-200 transition hover:border-emerald-300/30 hover:bg-emerald-300/[0.08]"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-300/[0.1] text-emerald-300">
                <Check size={17} />
              </span>
              It matched the expected result
              <ChevronRight
                className="ml-auto text-slate-600 transition group-hover:translate-x-0.5"
                size={17}
              />
            </button>
            <button
              type="button"
              onClick={onDifferent}
              className="group flex min-h-14 items-center gap-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.035] px-4 text-left text-sm font-semibold text-slate-200 transition hover:border-amber-300/30 hover:bg-amber-300/[0.07]"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-300/[0.09] text-amber-300">
                <Keyboard size={17} />
              </span>
              The result was different
              <ChevronRight
                className="ml-auto text-slate-600 transition group-hover:translate-x-0.5"
                size={17}
              />
            </button>
            <button
              type="button"
              onClick={onCannotComplete}
              className="group flex min-h-14 items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 text-left text-sm font-semibold text-slate-400 transition hover:border-red-300/20 hover:bg-red-300/[0.035] hover:text-slate-200"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.04] text-slate-400">
                <ShieldCheck size={17} />
              </span>
              I cannot safely complete this
              <ChevronRight
                className="ml-auto text-slate-600 transition group-hover:translate-x-0.5"
                size={17}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ConversationHistory({
  history,
  activeId,
  onResume,
}: {
  history: DiagnosticHistoryEntry[];
  activeId: string;
  onResume(entry: DiagnosticHistoryEntry): void;
}) {
  if (!history.length) {
    return (
      <div className="mt-5 rounded-xl border border-dashed border-white/[0.09] bg-white/[0.015] p-4">
        <History size={18} className="text-slate-600" />
        <p className="mt-3 text-sm font-semibold text-slate-300">No saved conversations yet</p>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          Your diagnostic conversation will appear here after the first message.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-2">
      {history.slice(0, 5).map((entry) => (
        <button
          key={entry.id}
          type="button"
          onClick={() => onResume(entry)}
          className={cn(
            "w-full rounded-xl border p-3.5 text-left transition",
            entry.id === activeId
              ? "border-teal-300/20 bg-teal-300/[0.055]"
              : "border-white/[0.07] bg-white/[0.018] hover:border-white/[0.14] hover:bg-white/[0.035]",
          )}
        >
          <div className="flex items-start gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.04] text-teal-300">
              <History size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-200">
                {entry.title}
              </span>
              <span className="mt-1 block text-xs text-slate-600">
                {new Intl.DateTimeFormat(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(entry.updatedAt))}
                {entry.messages.length > 1 ? ` | ${entry.messages.length} messages` : ""}
              </span>
            </span>
            <ChevronRight size={16} className="mt-1 shrink-0 text-slate-600" />
          </div>
        </button>
      ))}
    </div>
  );
}

function ReadyPanel() {
  return (
    <div className="mt-7">
      <div className="rounded-2xl border border-teal-300/15 bg-teal-300/[0.035] p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-300/70">
          Start with the observation
        </p>
        <p className="mt-2 text-lg font-semibold text-white">
          Describe what is happening in the field
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Pocket Technician will match a reviewed procedure after it understands the issue. It does
          not assume a fault before you report one.
        </p>
      </div>
      <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
        <p className="text-sm font-semibold text-slate-200">Include these observations</p>
        <ul className="mt-5 space-y-3">
          {[
            "Exact device or station",
            "Fault text or status shown locally",
            "What moved or did not move",
          ].map((item) => (
            <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-teal-300/[0.07] text-teal-300">
                <Check size={14} />
              </span>
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-5 border-t border-white/[0.06] pt-4 text-xs leading-5 text-slate-600">
          Use voice, text, or a photo. Keep messages limited to equipment information.
        </p>
      </div>
    </div>
  );
}

function phaseLabel(phase: AssistantPhase): string {
  if (phase === "listening") return "Listening—speak now";
  if (phase === "thinking") return "Finding the safest next step";
  if (phase === "speaking") return "Reading your instruction aloud";
  return "Ready for your observation";
}

function createSessionId(): string {
  return crypto.randomUUID();
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

async function compressPhoto(file: File): Promise<string> {
  if (!file.type.match(/^image\/(jpeg|png|webp)$/)) throw new Error("Unsupported image type");
  const source = await createImageBitmap(file);
  const maxDimension = 1_280;
  const scale = Math.min(1, maxDimension / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close();
  return canvas.toDataURL("image/jpeg", 0.72);
}
