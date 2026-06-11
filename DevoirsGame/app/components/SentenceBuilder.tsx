"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Sentence = {
  hint: string;
  correctOrder: string[];
  extraWords?: string[];
};

type Token = { id: number; word: string; placed: boolean };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function SentenceBuilder({
  sentences,
  onWin,
}: {
  sentences: Sentence[];
  onWin: (stats: { score: number; total: number; durationMs: number }) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<"idle" | "correct" | "wrong">("idle");
  const [startedAt] = useState(() => Date.now());

  const sentence = sentences[idx];
  const total = sentences.length;

  const initialTokens = useMemo<Token[]>(() => {
    if (!sentence) return [];
    const all = [...sentence.correctOrder, ...(sentence.extraWords ?? [])];
    return shuffle(all.map((w, i) => ({ id: i, word: w, placed: false })));
  }, [sentence]);

  const [tokens, setTokens] = useState<Token[]>([]);
  const [placedIds, setPlacedIds] = useState<number[]>([]);

  useEffect(() => {
    setTokens(initialTokens);
    setPlacedIds([]);
    setFeedback("idle");
  }, [initialTokens]);

  function tapBankWord(token: Token) {
    if (feedback === "correct") return;
    if (token.placed) return;
    setTokens((t) => t.map((x) => (x.id === token.id ? { ...x, placed: true } : x)));
    setPlacedIds((p) => [...p, token.id]);
  }

  function tapPlacedWord(tokenId: number) {
    if (feedback === "correct") return;
    setTokens((t) => t.map((x) => (x.id === tokenId ? { ...x, placed: false } : x)));
    setPlacedIds((p) => p.filter((id) => id !== tokenId));
  }

  const placedWords = useMemo(
    () => placedIds.map((id) => tokens.find((t) => t.id === id)!.word),
    [placedIds, tokens],
  );

  const nextSentence = useCallback(() => {
    if (idx + 1 >= total) {
      onWin({ score, total, durationMs: Date.now() - startedAt });
    } else {
      setIdx((i) => i + 1);
    }
  }, [idx, total, score, startedAt, onWin]);

  function checkAnswer() {
    if (!sentence) return;
    const correct = sentence.correctOrder;
    if (placedWords.length !== correct.length) return;
    const isRight = placedWords.every((w, i) => w === correct[i]);
    if (isRight) {
      setScore((s) => s + 10);
      setFeedback("correct");
      setTimeout(nextSentence, 1400);
    } else {
      setFeedback("wrong");
      setTimeout(() => setFeedback("idle"), 800);
    }
  }

  function clearAll() {
    setTokens((t) => t.map((x) => ({ ...x, placed: false })));
    setPlacedIds([]);
    setFeedback("idle");
  }

  if (!sentence) return null;

  const expectedLen = sentence.correctOrder.length;
  const isFull = placedWords.length === expectedLen;

  return (
    <div>
      <div className="flex justify-between items-center mb-3 text-sm">
        <div className="bg-white rounded-full px-3 py-1.5 shadow-sm border border-brand-100">
          <span className="text-slate-500">Phrase </span>
          <span className="font-bold text-brand-700">{idx + 1}</span>
          <span className="text-slate-500"> / {total}</span>
        </div>
        <div className="bg-white rounded-full px-3 py-1.5 shadow-sm border border-brand-100">
          <span className="text-amber-500">⭐</span>
          <span className="font-bold text-amber-600 ml-1">{score}</span>
        </div>
      </div>

      <div className="mb-4 rounded-2xl bg-white p-4 shadow-md border-2 border-brand-100">
        <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Indice</div>
        <div className="text-base font-semibold text-slate-800">{sentence.hint}</div>
      </div>

      {/* Sentence area */}
      <div
        className={`mb-4 min-h-[88px] rounded-2xl p-3 shadow-inner border-2 transition-colors ${
          feedback === "correct"
            ? "bg-emerald-50 border-emerald-300"
            : feedback === "wrong"
              ? "bg-rose-50 border-rose-300 animate-shake"
              : "bg-violet-50 border-brand-200"
        }`}
      >
        <div className="text-xs text-slate-500 mb-2">Construis la phrase :</div>
        <div className="flex flex-wrap gap-2 items-center min-h-[44px]">
          {placedWords.length === 0 && (
            <span className="text-slate-400 italic text-sm">Appuie sur les mots ci-dessous…</span>
          )}
          {placedIds.map((tokenId, i) => {
            const token = tokens.find((t) => t.id === tokenId)!;
            return (
              <button
                key={tokenId}
                onClick={() => tapPlacedWord(tokenId)}
                disabled={feedback === "correct"}
                className="px-3 py-2 bg-white border-2 border-brand-300 rounded-xl shadow-sm font-semibold text-slate-800 active:scale-95 animate-pop"
              >
                {token.word}
              </button>
            );
          })}
          {Array.from({ length: Math.max(0, expectedLen - placedWords.length) }).map((_, i) => (
            <span
              key={`slot-${i}`}
              className="px-3 py-2 border-2 border-dashed border-brand-300 rounded-xl text-brand-300"
            >
              ___
            </span>
          ))}
        </div>
      </div>

      {/* Word bank */}
      <div className="mb-4 rounded-2xl p-3 bg-white shadow-md border border-brand-100">
        <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Tes mots</div>
        <div className="flex flex-wrap gap-2">
          {tokens.map((t) => (
            <button
              key={t.id}
              onClick={() => tapBankWord(t)}
              disabled={t.placed || feedback === "correct"}
              className={`px-3 py-2 rounded-xl font-semibold shadow-sm active:scale-95 transition-all ${
                t.placed
                  ? "bg-slate-100 text-slate-300 border-2 border-slate-200"
                  : "bg-gradient-to-br from-brand-500 to-brand-700 text-white border-2 border-brand-700"
              }`}
            >
              {t.word}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={clearAll}
          disabled={placedIds.length === 0 || feedback === "correct"}
          className="flex-1 bg-white border-2 border-slate-200 text-slate-700 font-semibold py-3 rounded-2xl active:scale-95 disabled:opacity-40"
        >
          ↩️ Effacer
        </button>
        <button
          onClick={checkAnswer}
          disabled={!isFull || feedback === "correct"}
          className="flex-1 bg-brand-600 text-white font-bold py-3 rounded-2xl shadow active:scale-95 disabled:opacity-40 disabled:bg-slate-400"
        >
          {feedback === "correct" ? "Bravo ! 🎉" : "Vérifier ✓"}
        </button>
      </div>
    </div>
  );
}
