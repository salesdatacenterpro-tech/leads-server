"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Round = {
  prompt: string;
  correctAnswer: string;
  decoys: string[];
};

type Bubble = {
  id: number;
  text: string;
  isCorrect: boolean;
  leftPct: number; // 0..100
  startedAt: number;
  durationMs: number;
  hue: number;
};

const BUBBLE_DURATION_MS = 5500;
const SPAWN_INTERVAL_MS = 900;
const ROUND_TIMEOUT_MS = 12000;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function BubblePop({
  rounds,
  onWin,
}: {
  rounds: Round[];
  onWin: (stats: { score: number; total: number; durationMs: number }) => void;
}) {
  const [roundIdx, setRoundIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [feedback, setFeedback] = useState<"idle" | "correct" | "wrong">("idle");
  const [popping, setPopping] = useState<Set<number>>(new Set());
  const [startedAt] = useState(() => Date.now());
  const bubbleIdRef = useRef(0);
  const spawnPoolRef = useRef<string[]>([]);
  const roundStartRef = useRef<number>(Date.now());

  const round = rounds[roundIdx];
  const total = rounds.length;

  // Reset pool when round changes
  useEffect(() => {
    if (!round) return;
    const pool: string[] = [];
    // 3 correct answers spread over the round to give chances
    for (let i = 0; i < 3; i++) pool.push(round.correctAnswer);
    // All decoys, repeated to fill the round
    const decoys = round.decoys.length > 0 ? round.decoys : ["?"];
    for (let i = 0; i < 6; i++) pool.push(decoys[i % decoys.length]);
    spawnPoolRef.current = shuffle(pool);
    roundStartRef.current = Date.now();
    setBubbles([]);
    setFeedback("idle");
  }, [round]);

  // Spawn bubbles
  useEffect(() => {
    if (!round || feedback === "correct") return;
    const interval = setInterval(() => {
      const pool = spawnPoolRef.current;
      if (pool.length === 0) return;
      const text = pool.shift()!;
      const newBubble: Bubble = {
        id: ++bubbleIdRef.current,
        text,
        isCorrect: text === round.correctAnswer,
        leftPct: 8 + Math.random() * 76,
        startedAt: Date.now(),
        durationMs: BUBBLE_DURATION_MS + Math.random() * 1000,
        hue: 250 + Math.floor(Math.random() * 80),
      };
      setBubbles((b) => [...b, newBubble]);
    }, SPAWN_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [round, feedback]);

  // Cleanup off-screen bubbles
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setBubbles((bs) => bs.filter((b) => now - b.startedAt < b.durationMs + 200));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Round timeout — auto advance if nothing tapped
  useEffect(() => {
    if (!round || feedback === "correct") return;
    const t = setTimeout(() => {
      if (feedback !== "correct") nextRound();
    }, ROUND_TIMEOUT_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx]);

  const nextRound = useCallback(() => {
    if (roundIdx + 1 >= total) {
      onWin({ score, total, durationMs: Date.now() - startedAt });
    } else {
      setRoundIdx((i) => i + 1);
    }
  }, [roundIdx, total, score, startedAt, onWin]);

  function onBubbleTap(b: Bubble) {
    if (feedback === "correct") return;
    setPopping((p) => new Set(p).add(b.id));
    setTimeout(() => {
      setBubbles((bs) => bs.filter((x) => x.id !== b.id));
      setPopping((p) => {
        const n = new Set(p);
        n.delete(b.id);
        return n;
      });
    }, 220);

    if (b.isCorrect) {
      const elapsed = Date.now() - roundStartRef.current;
      const speedBonus = Math.max(0, 5 - Math.floor(elapsed / 1000));
      setScore((s) => s + 10 + speedBonus);
      setFeedback("correct");
      setTimeout(nextRound, 700);
    } else {
      setFeedback("wrong");
      setScore((s) => Math.max(0, s - 1));
      setTimeout(() => setFeedback("idle"), 400);
    }
  }

  if (!round) return null;

  return (
    <div>
      <div className="flex justify-between items-center mb-3 text-sm">
        <div className="bg-white rounded-full px-3 py-1.5 shadow-sm border border-brand-100">
          <span className="text-slate-500">Question </span>
          <span className="font-bold text-brand-700">{roundIdx + 1}</span>
          <span className="text-slate-500"> / {total}</span>
        </div>
        <div className="bg-white rounded-full px-3 py-1.5 shadow-sm border border-brand-100">
          <span className="text-amber-500">⭐</span>
          <span className="font-bold text-amber-600 ml-1">{score}</span>
        </div>
      </div>

      <div
        className={`mb-3 rounded-2xl p-5 text-center shadow-md border-2 transition-colors ${
          feedback === "correct"
            ? "bg-emerald-50 border-emerald-300"
            : feedback === "wrong"
              ? "bg-rose-50 border-rose-300 animate-shake"
              : "bg-white border-brand-200"
        }`}
      >
        <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
          Trouve la bonne bulle 🫧
        </div>
        <div className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
          {round.prompt}
        </div>
        {feedback === "correct" && (
          <div className="mt-2 text-emerald-700 font-bold animate-pop">Bravo ! 🎉</div>
        )}
      </div>

      <div className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-b from-sky-100 to-violet-100 border-2 border-brand-100 shadow-inner" style={{ height: "60vh", minHeight: "380px" }}>
        {bubbles.map((b) => {
          const isPopping = popping.has(b.id);
          return (
            <button
              key={b.id}
              onClick={() => onBubbleTap(b)}
              disabled={isPopping}
              className="absolute select-none touch-manipulation active:scale-90"
              style={{
                left: `${b.leftPct}%`,
                bottom: 0,
                transform: "translate(-50%, 0)",
                animation: isPopping
                  ? "popBubble 220ms ease-out forwards"
                  : `floatUp ${b.durationMs}ms linear forwards`,
              }}
            >
              <div
                className="rounded-full px-4 py-3 sm:px-5 sm:py-4 shadow-lg font-bold text-white text-sm sm:text-base whitespace-nowrap"
                style={{
                  background: `radial-gradient(circle at 30% 25%, hsl(${b.hue}, 90%, 80%), hsl(${b.hue}, 75%, 55%))`,
                  border: "2px solid rgba(255,255,255,0.6)",
                  minWidth: "60px",
                  textAlign: "center",
                }}
              >
                {b.text}
              </div>
            </button>
          );
        })}
        {bubbles.length === 0 && feedback !== "correct" && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
            Les bulles arrivent…
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes floatUp {
          from { transform: translate(-50%, 0); opacity: 0.4; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          to { transform: translate(-50%, calc(-60vh - 80px)); opacity: 0; }
        }
        @keyframes popBubble {
          0% { transform: translate(-50%, var(--y, 0)) scale(1); opacity: 1; }
          100% { transform: translate(-50%, var(--y, 0)) scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
