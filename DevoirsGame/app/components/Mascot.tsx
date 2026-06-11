"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MASCOT_EMOJI = "🦊";

function pickFrenchVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  // Prefer enhanced French voices
  const preferred = ["Amélie", "Thomas", "Audrey", "Marie", "Aurelie"];
  for (const name of preferred) {
    const v = voices.find((vo) => vo.name.includes(name));
    if (v) return v;
  }
  return (
    voices.find((v) => v.lang === "fr-FR") ??
    voices.find((v) => v.lang.startsWith("fr")) ??
    null
  );
}

export default function Mascot({
  title,
  instructions,
  autoPlay = false,
}: {
  title: string;
  instructions: string;
  autoPlay?: boolean;
}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);
  const triedAutoPlayRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSupported(false);
    }
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    synth.cancel();

    const phrase = `${title}. ${instructions}`;
    const u = new SpeechSynthesisUtterance(phrase);
    u.lang = "fr-FR";
    u.rate = 0.95;
    u.pitch = 1.15;
    const voice = pickFrenchVoice();
    if (voice) u.voice = voice;

    u.onstart = () => setIsSpeaking(true);
    u.onend = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);

    synth.speak(u);
  }, [title, instructions]);

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  // Auto-play attempt (will silently fail on iOS until user interacts)
  useEffect(() => {
    if (!autoPlay || triedAutoPlayRef.current) return;
    triedAutoPlayRef.current = true;
    const t = setTimeout(() => speak(), 400);
    return () => clearTimeout(t);
  }, [autoPlay, speak]);

  return (
    <div className="flex items-start gap-3 mb-6">
      <button
        onClick={isSpeaking ? stop : speak}
        aria-label={isSpeaking ? "Arrêter la lecture" : "Écouter la consigne"}
        className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 shadow-lg flex items-center justify-center text-4xl sm:text-5xl ${
          isSpeaking ? "animate-talk" : "animate-bob"
        } active:scale-95 transition-transform`}
      >
        {MASCOT_EMOJI}
      </button>

      <div className="flex-1 bg-white rounded-2xl rounded-tl-none p-4 shadow-md border-2 border-brand-100 relative">
        {/* tail */}
        <div className="absolute -left-2 top-3 w-4 h-4 bg-white border-l-2 border-b-2 border-brand-100 transform rotate-45" />

        <div className="text-sm sm:text-base text-slate-800 font-medium leading-snug">
          <span className="font-bold text-brand-700">{title}</span>
          <span className="block mt-1 text-slate-600">{instructions}</span>
        </div>

        {supported && (
          <button
            onClick={isSpeaking ? stop : speak}
            className="mt-3 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-brand-700 hover:text-brand-800 active:scale-95 transition"
          >
            {isSpeaking ? (
              <>
                <span className="text-base">⏸️</span>
                Arrêter
              </>
            ) : (
              <>
                <span className="text-base">🔊</span>
                Écouter la consigne
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
