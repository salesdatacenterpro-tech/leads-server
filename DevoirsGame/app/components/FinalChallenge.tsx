"use client";

import { useEffect, useRef, useState } from "react";

export type Challenge = {
  question: string;
  expectedAnswers: string[];
  inputType: "text" | "number";
  hint?: string;
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[.,;:!?'"`«»()\[\]{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isAnswerCorrect(answer: string, expected: string[]): boolean {
  const n = normalize(answer);
  if (n.length === 0) return false;
  return expected.some((e) => normalize(e) === n);
}

export default function FinalChallenge({
  challenges,
  onDone,
}: {
  challenges: Challenge[];
  onDone: (stats: { correct: number; total: number }) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [state, setState] = useState<"answering" | "correct" | "wrong">("answering");
  const [correctCount, setCorrectCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const challenge = challenges[idx];
  const total = challenges.length;

  useEffect(() => {
    setAnswer("");
    setState("answering");
    // Focus the input after a tiny delay so the keyboard pops up cleanly on mobile
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, [idx]);

  function submit(e?: React.FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    if (state !== "answering") return;
    if (answer.trim().length === 0) return;
    const correct = isAnswerCorrect(answer, challenge.expectedAnswers);
    if (correct) {
      setState("correct");
      setCorrectCount((c) => c + 1);
    } else {
      setState("wrong");
    }
  }

  function nextChallenge() {
    if (idx + 1 >= total) {
      onDone({ correct: correctCount, total });
    } else {
      setIdx((i) => i + 1);
    }
  }

  if (!challenge) return null;

  const accentColor =
    state === "correct"
      ? "border-emerald-300 bg-emerald-50"
      : state === "wrong"
        ? "border-rose-300 bg-rose-50 animate-shake"
        : "border-amber-300 bg-amber-50";

  return (
    <div className="max-w-md mx-auto">
      {/* Boss banner */}
      <div className="mb-4 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 p-4 shadow-lg text-white text-center">
        <div className="text-3xl mb-1">🎯</div>
        <div className="text-xs uppercase tracking-wider opacity-90">Épreuve finale</div>
        <div className="text-lg font-bold">Question {idx + 1} / {total}</div>
      </div>

      {/* Mascot intro */}
      <div className="mb-4 flex items-start gap-3">
        <div className="text-4xl flex-shrink-0">🦊</div>
        <div className="flex-1 bg-white rounded-2xl rounded-tl-none p-3 shadow border-2 border-amber-100 text-sm text-slate-700">
          Tu as bien joué ! Maintenant, montre-moi que tu connais la <span className="font-bold">vraie réponse</span> du devoir.
        </div>
      </div>

      {/* The question */}
      <div className={`rounded-2xl p-5 shadow-md border-2 transition-colors ${accentColor}`}>
        <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">La question du devoir</div>
        <div className="text-lg font-bold text-slate-900 leading-snug mb-1">
          {challenge.question}
        </div>
        {challenge.hint && state === "answering" && (
          <div className="mt-2 text-xs text-amber-700">💡 {challenge.hint}</div>
        )}

        {state !== "correct" && (
          <form onSubmit={submit} className="mt-4">
            <input
              ref={inputRef}
              type={challenge.inputType === "number" ? "text" : "text"}
              inputMode={challenge.inputType === "number" ? "decimal" : "text"}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={answer}
              onChange={(e) => {
                setAnswer(e.target.value);
                if (state === "wrong") setState("answering");
              }}
              placeholder="Écris ta réponse…"
              className="w-full rounded-xl border-2 border-slate-300 focus:border-brand-500 focus:outline-none px-4 py-3 text-lg font-semibold bg-white"
            />
            <button
              type="submit"
              disabled={answer.trim().length === 0}
              className="mt-3 w-full bg-brand-600 text-white font-bold py-3 rounded-xl shadow active:scale-95 disabled:opacity-40"
            >
              Valider ✓
            </button>
          </form>
        )}

        {state === "wrong" && (
          <div className="mt-3 text-rose-700 text-sm font-semibold">
            Pas tout à fait — essaie encore ! 💪
          </div>
        )}

        {state === "correct" && (
          <div className="mt-4 animate-pop">
            <div className="text-emerald-700 font-bold text-base">✨ Bonne réponse !</div>
            <div className="text-sm text-slate-600 mt-1">
              Réponse acceptée : <span className="font-semibold text-emerald-700">{challenge.expectedAnswers[0]}</span>
            </div>
            <button
              onClick={nextChallenge}
              className="mt-4 w-full bg-emerald-600 text-white font-bold py-3 rounded-xl shadow active:scale-95"
            >
              {idx + 1 >= total ? "Voir mes résultats 🎉" : "Question suivante →"}
            </button>
          </div>
        )}

        {state === "wrong" && (
          <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 text-sm">
            <div className="text-slate-500">La bonne réponse était :</div>
            <div className="font-bold text-slate-800 mt-0.5">{challenge.expectedAnswers[0]}</div>
            <button
              onClick={nextChallenge}
              className="mt-3 w-full bg-slate-100 text-slate-700 font-semibold py-2 rounded-lg active:scale-95"
            >
              {idx + 1 >= total ? "Voir mes résultats →" : "Question suivante →"}
            </button>
          </div>
        )}
      </div>

      {/* Progress dots */}
      <div className="mt-4 flex justify-center gap-1.5">
        {challenges.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full ${
              i < idx ? "bg-emerald-500" : i === idx ? "bg-amber-500" : "bg-slate-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
