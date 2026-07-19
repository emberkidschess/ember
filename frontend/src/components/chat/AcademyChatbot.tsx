"use client";

import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, X } from "lucide-react";
import { ChatHistoryInput, streamAcademyChat } from "@/lib/chat";

const STORAGE_KEY = "emberkids-academy-chat-v1";
const WELCOME_ID = "emberkids-welcome";
const MAX_STORED_MESSAGES = 30;
const GREETING_PLAYED_KEY = "emberkids-amber-greeting-played-v3";
const WELCOME_INTRO = "Hi! I’m Amber 👋";
const WELCOME_BODY =
  "Welcome to EmberKids Academy! I'm here to help you with courses, fees, free demo classes, batch timings, admissions, and any other questions you may have.";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  state?: "streaming" | "error";
  retryText?: string;
}

interface AcademyChatbotProps {
  launcherVisible: boolean;
}

const welcomeMessage: ChatMessage = {
  id: WELCOME_ID,
  role: "assistant",
  content: `${WELCOME_INTRO}\n${WELCOME_BODY}`,
};

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function safeStoredMessages(value: unknown): ChatMessage[] | null {
  if (!value || typeof value !== "object" || !("messages" in value)) return null;
  const messages = (value as { messages?: unknown }).messages;
  if (!Array.isArray(messages)) return null;

  const valid = messages
    .filter(
      (message): message is ChatMessage =>
        Boolean(
          message &&
            typeof message === "object" &&
            "id" in message &&
            typeof message.id === "string" &&
            "role" in message &&
            (message.role === "user" || message.role === "assistant") &&
            "content" in message &&
            typeof message.content === "string"
        )
    )
    .map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      state: message.state === "error" ? "error" as const : undefined,
      retryText: typeof message.retryText === "string" ? message.retryText : undefined,
    }));

  return valid.length ? valid.slice(-MAX_STORED_MESSAGES) : null;
}

function MessageText({ text, emphasizeFirstLine = false }: { text: string; emphasizeFirstLine?: boolean }) {
  if (emphasizeFirstLine) {
    const [intro, ...body] = text.split("\n");
    return (
      <p className="whitespace-pre-wrap break-words text-[13px] leading-[1.6] sm:text-sm">
        <strong className="mb-1 block font-bold">{intro}</strong>
        {body.join("\n")}
      </p>
    );
  }

  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <p className="whitespace-pre-wrap break-words text-[13px] leading-[1.6] sm:text-sm">
      {parts.map((part, index) =>
        /^https?:\/\//.test(part) ? (() => {
          const match = part.match(/^(.*?)([.,!?)]*)$/);
          const href = match?.[1] || part;
          const punctuation = match?.[2] || "";
          return (
            <span key={`${part}-${index}`}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline decoration-current/30 underline-offset-2 hover:decoration-current"
              >
                {href}
              </a>
              {punctuation}
            </span>
          );
        })() : part
      )}
    </p>
  );
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1.5 py-1.5" aria-label="Ember is typing">
      {[0, 1, 2].map((dot) => (
        <motion.span
          key={dot}
          className="h-1.5 w-1.5 rounded-full bg-[var(--color-ember)]"
          animate={{ y: [0, -3, 0], opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 0.82, repeat: Infinity, delay: dot * 0.14 }}
        />
      ))}
    </span>
  );
}

export default function AcademyChatbot({
  launcherVisible,
}: AcademyChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [isSending, setIsSending] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isMascotHovered, setIsMascotHovered] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const greetingAudioRef = useRef<HTMLAudioElement>(null);
  const tapAudioContextRef = useRef<AudioContext | null>(null);
  const greetingPlayedRef = useRef(false);
  const launcherMessageVisibleRef = useRef(!isOpen);

  useEffect(() => {
    launcherMessageVisibleRef.current = !isOpen;
  }, [isOpen]);

  const playGreetingSound = useCallback(() => {
    if (!launcherMessageVisibleRef.current || greetingPlayedRef.current) return;

    const audio = greetingAudioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    audio.volume = 0.72;
    const playPromise = audio.play();
    greetingPlayedRef.current = true;
    try {
      sessionStorage.setItem(GREETING_PLAYED_KEY, "1");
    } catch {
      // Session storage is optional; the in-memory guard still prevents repeats.
    }
    playPromise?.catch(() => {
      greetingPlayedRef.current = false;
      try {
        sessionStorage.removeItem(GREETING_PLAYED_KEY);
      } catch {
        // Ignore storage errors.
      }
    });
  }, []);

  useEffect(() => {
    try {
      greetingPlayedRef.current = sessionStorage.getItem(GREETING_PLAYED_KEY) === "1";
    } catch {
      greetingPlayedRef.current = false;
    }

    const playGreetingAfterInteraction = (event: Event) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-ember-launcher]")) return;
      playGreetingSound();
    };

    window.addEventListener("pointerdown", playGreetingAfterInteraction, true);
    window.addEventListener("keydown", playGreetingAfterInteraction, true);
    return () => {
      window.removeEventListener("pointerdown", playGreetingAfterInteraction, true);
      window.removeEventListener("keydown", playGreetingAfterInteraction, true);
    };
  }, [playGreetingSound]);

  useEffect(
    () => () => {
      void tapAudioContextRef.current?.close();
    },
    []
  );

  const playTapSound = () => {
    if (typeof window === "undefined") return;

    const AudioContextConstructor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;

    const context = tapAudioContextRef.current ?? new AudioContextConstructor();
    tapAudioContextRef.current = context;

    const playChirp = () => {
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(640, now);
      oscillator.frequency.exponentialRampToValueAtTime(900, now + 0.08);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.022, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.12);
    };

    if (context.state === "suspended") {
      void context.resume().then(playChirp).catch(() => undefined);
    } else {
      playChirp();
    }
  };

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      const stored = raw ? safeStoredMessages(JSON.parse(raw)) : null;
      if (stored) {
        setMessages(
          stored.map((message) => (message.id === WELCOME_ID ? welcomeMessage : message))
        );
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    const stored = messages
      .filter((message) => message.state !== "streaming")
      .slice(-MAX_STORED_MESSAGES);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, messages: stored }));
  }, [isHydrated, messages]);

  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isOpen]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 112)}px`;
  }, [draft]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    let blinkTimeout: ReturnType<typeof setTimeout> | undefined;
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      blinkTimeout = setTimeout(() => setIsBlinking(false), 260);
    }, 2_000);

    return () => {
      clearInterval(blinkInterval);
      if (blinkTimeout) clearTimeout(blinkTimeout);
    };
  }, []);

  const requestHistory = useMemo<ChatHistoryInput[]>(
    () =>
      messages
        .filter(
          (message) =>
            message.id !== WELCOME_ID &&
            message.state !== "error" &&
            message.state !== "streaming" &&
            message.content.trim()
        )
        .slice(-8)
        .map((message) => ({ role: message.role, content: message.content })),
    [messages]
  );

  const sendMessage = async (suggestedText?: string) => {
    const content = (suggestedText ?? draft).trim();
    if (!content || isSending) return;

    const userMessage: ChatMessage = { id: newId(), role: "user", content };
    const assistantId = newId();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      state: "streaming",
    };

    setMessages((current) => [...current, userMessage, assistantMessage]);
    setDraft("");
    setIsSending(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamAcademyChat({
        message: content,
        history: requestHistory,
        signal: controller.signal,
        onToken: (token) => {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? { ...message, content: message.content + token }
                : message
            )
          );
        },
        onDone: () => {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? { ...message, state: undefined }
                : message
            )
          );
        },
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      const message =
        error instanceof Error
          ? error.message
          : "I couldn’t reply right now. Please try again.";
      setMessages((current) =>
        current.map((item) =>
          item.id === assistantId
            ? {
                ...item,
                content: message,
                state: "error",
                retryText: content,
              }
            : item
        )
      );
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsSending(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void sendMessage();
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void sendMessage();
    }
  };

  return (
    <>
      <audio
        ref={greetingAudioRef}
        src="/sounds/amber-greeting-final.wav"
        preload="auto"
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        aria-hidden="true"
      />
      <AnimatePresence>
        {isOpen && (
          <motion.section
            id="emberkids-chat-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Chat with EmberKids Chess Academy"
            initial={{ opacity: 0, y: 14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.985 }}
            transition={{ type: "spring", stiffness: 360, damping: 32, mass: 0.7 }}
            className="fixed bottom-[11rem] right-4 z-[140] flex h-[min(500px,calc(100dvh-12rem))] w-[calc(100vw-2rem)] max-w-[410px] min-h-0 flex-col overflow-hidden rounded-[24px] border border-[var(--color-line)] bg-[var(--color-paper)] shadow-[0_24px_70px_-30px_rgba(31,27,22,0.6)] sm:right-6 sm:h-[min(540px,calc(100dvh-12rem))] sm:w-[410px] sm:max-w-none"
          >
            <header className="flex shrink-0 items-center gap-3 border-b border-[var(--color-line)] px-4 py-3.5 sm:px-5">
              <Image
                src="/images/fav.png"
                alt="EmberKids Chess Academy"
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 object-contain"
                priority
              />
              <div className="min-w-0 flex-1">
                <h2 className="font-[family-name:var(--font-playfair)] text-[19px] font-bold leading-tight text-[#f85b1c]">
                  Ember<span className="text-black">Kids</span>
                </h2>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--color-muted)]">
                  Academy assistant
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-muted)] transition hover:bg-[var(--color-ivory)] hover:text-[var(--color-walnut)] active:scale-95"
                aria-label="Close chat"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div
              ref={scrollRef}
              className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-paper)] px-4 py-4 sm:px-5 sm:py-5"
              aria-live="polite"
            >
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[88%] ${message.role === "assistant" ? "max-w-[92%]" : ""}`}>
                      <div
                        className={`${
                          message.role === "user"
                            ? "rounded-[18px] rounded-br-md bg-[var(--color-walnut)] px-3.5 py-2.5 text-white"
                            : message.state === "error"
                              ? "rounded-[16px] bg-[#fff5f1] px-3.5 py-2.5 text-[var(--color-walnut)]"
                              : "px-1 py-1 text-[var(--color-walnut)]"
                        }`}
                      >
                        {message.state === "streaming" && !message.content ? (
                          <TypingDots />
                        ) : (
                          <MessageText text={message.content} emphasizeFirstLine={message.id === WELCOME_ID} />
                        )}
                      </div>
                      {message.state === "error" && message.retryText && (
                        <button
                          type="button"
                          onClick={() => void sendMessage(message.retryText)}
                          disabled={isSending}
                          className="mt-2 pl-1 text-xs font-bold text-[var(--color-ember)] hover:underline disabled:opacity-50"
                        >
                          Try again
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="shrink-0 border-t border-[var(--color-line)] bg-[var(--color-paper)] px-3 pb-3 pt-2.5 sm:px-4">
              <form
                onSubmit={onSubmit}
                className="flex items-end gap-2 rounded-[18px] border border-[var(--color-line)] bg-white p-1.5 transition focus-within:border-[var(--color-ember)]/45 focus-within:shadow-[0_0_0_4px_rgba(199,93,60,0.08)]"
              >
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value.slice(0, 1200))}
                  onKeyDown={onInputKeyDown}
                  rows={1}
                  placeholder="Message EmberKids…"
                  aria-label="Message EmberKids"
                  className="min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-5 text-[var(--color-walnut)] outline-none placeholder:text-[var(--color-muted)]/60"
                />
                <motion.button
                  type="submit"
                  disabled={!draft.trim() || isSending}
                  whileTap={{ scale: 0.92 }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-ember)] text-white transition hover:bg-[var(--color-ember-deep)] disabled:cursor-not-allowed disabled:bg-[var(--color-line-strong)]"
                  aria-label={isSending ? "Sending message" : "Send message"}
                >
                  {isSending ? (
                    <motion.span
                      className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </motion.button>
              </form>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {launcherVisible && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="relative"
          >
            <button
              type="button"
              onClick={() => setIsOpen((open) => !open)}
              onPointerEnter={() => setIsMascotHovered(true)}
              onPointerLeave={() => setIsMascotHovered(false)}
              onPointerDown={() => {
                setIsMascotHovered(true);
                const shouldPlayGreeting =
                  launcherMessageVisibleRef.current && !greetingPlayedRef.current;
                if (shouldPlayGreeting) {
                  // Start the voice inside the user gesture, then add the soft chirp
                  // just after it so the first syllable stays clear.
                  playGreetingSound();
                  window.setTimeout(playTapSound, 140);
                } else {
                  playTapSound();
                }
              }}
              data-ember-launcher
              aria-label={isOpen ? "Close chat" : "Open EmberKids chat"}
              aria-expanded={isOpen}
              aria-controls="emberkids-chat-dialog"
              className="relative flex h-[78px] w-[78px] cursor-pointer items-center justify-center bg-transparent outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-ember)]/25"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-3 rounded-full bg-[var(--color-ember)]/16 blur-[14px]"
              />
              <motion.span
                className="relative z-10 block h-full w-full"
                animate={{
                  rotate: [0, -1.2, 1.2, 0],
                }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <Image
                  src={
                    isMascotHovered || isBlinking
                      ? "/images/ember-mascot-3d-blink.png"
                      : "/images/ember-mascot-3d-transparent.png"
                  }
                  alt=""
                  fill
                  sizes="78px"
                  className="object-contain hover:scale-105 duration-300 drop-shadow-[0_8px_12px_rgba(199,93,60,0.35)]"
                  priority
                />
              </motion.span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
