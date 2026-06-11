"use client";

import { useState } from "react";

type Question = {
  scene: string;
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
};

export default function QuizQuest({
  story,
  questions,
  onWin,
}: {
  story: string;
  questions: Question[];
  onWin: (stats: { score: number; total: number }) => void;
}) {
  const [step, setStep] = useState<"intro" | "playing" | "feedback">("intro");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  const q = questions[index];

  function answer(i: number) {
    if (selected !== null) return;
    setSelected(i);
    if (i === q.correctIndex) setScore((s) => s + 1);
    setStep("feedback");
  }

  function next() {
    if (index + 1 >= questions.length) {
      onWin({ score: selected === q.correctIndex ? score : score, total: questions.length });
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setStep("playing");
  }

  if (step === "intro") {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 animate-pop">
        <div className="text-5xl text-center mb-4">🗺️</div>
        <h3 className="text-xl font-bold text-brand-700 mb-3 text-center">L'aventure commence</h3>
        <p className="text-slate-700 leading-relaxed mb-6">{story}</p>
        <button
          onClick={() => setStep("playing")}
          className="w-full bg-brand-600 hover:bg-brand-700 active:scale-[0.98] transition-all text-white font-semibold py-4 rounded-xl shadow"
        >
          C'est parti ! →
        </button>
      </div>
    );
  }

  const isCorrect = selected === q.correctIndex;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-slate-600">
        <div>
          Question <span className="font-semibold text-brand-700">{index + 1}</span> / {questions.length}
        </div>
        <div>
          Score : <span className="font-semibold">{score}</span>
        </div>
      </div>

      <div className="w-full bg-white rounded-full h-2 overflow-hidden">
        <div
          className="bg-brand-500 h-full transition-all"
          style={{ width: `${((index + (step === "feedback" ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-5 animate-pop">
        <p className="text-sm italic text-brand-700 mb-2">📍 {q.scene}</p>
        <p className="text-lg font-semibold text-slate-900 mb-4">{q.question}</p>
        <div className="space-y-2">
          {q.choices.map((choice, i) => {
            const isSel = selected === i;
            const isCorrectChoice = i === q.correctIndex;
            let cls = "bg-white border-slate-200 hover:bg-brand-50 hover:border-brand-300";
            if (selected !== null) {
              if (isCorrectChoice) cls = "bg-emerald-100 border-emerald-400 text-emerald-900";
              else if (isSel) cls = "bg-red-100 border-red-400 text-red-900";
              else cls = "bg-slate-50 border-slate-200 text-slate-500";
            }
            return (
              <button
                key={i}
                onClick={() => answer(i)}
                disabled={selected !== null}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 font-medium transition-all ${cls} ${
                  selected === null ? "active:scale-[0.98]" : ""
                }`}
              >
                <span className="inline-flex items-center justify-center w-6 h-6 mr-3 rounded-full bg-brand-100 text-brand-700 text-sm font-bold">
                  {String.fromCharCode(65 + i)}
                </span>
                {choice}
              </button>
            );
          })}
        </div>
      </div>

      {step === "feedback" && (
        <div
          className={`rounded-2xl p-5 shadow-lg animate-pop ${
            isCorrect ? "bg-emerald-50 border-2 border-emerald-300" : "bg-amber-50 border-2 border-amber-300"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="text-3xl">{isCorrect ? "🎉" : "💡"}</div>
            <div className="flex-1">
              <div className={`font-bold mb-1 ${isCorrect ? "text-emerald-800" : "text-amber-800"}`}>
                {isCorrect ? "Bravo !" : "Pas tout à fait…"}
              </div>
              <p className="text-sm text-slate-700">{q.explanation}</p>
            </div>
          </div>
          <button
            onClick={next}
            className="mt-4 w-full bg-brand-600 hover:bg-brand-700 active:scale-[0.98] transition-all text-white font-semibold py-3 rounded-xl shadow"
          >
            {index + 1 >= questions.length ? "Voir le résultat" : "Question suivante →"}
          </button>
        </div>
      )}
    </div>
  );
}
