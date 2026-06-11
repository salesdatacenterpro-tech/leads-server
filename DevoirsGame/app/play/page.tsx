"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MemoryGame from "../components/MemoryGame";
import QuizQuest from "../components/QuizQuest";
import BubblePop from "../components/BubblePop";
import SentenceBuilder from "../components/SentenceBuilder";
import Mascot from "../components/Mascot";
import FinalChallenge, { type Challenge } from "../components/FinalChallenge";

type MemoryGameData = { pairs: Array<{ left: string; right: string }> };
type QuizQuestData = {
  story: string;
  questions: Array<{
    scene: string;
    question: string;
    choices: string[];
    correctIndex: number;
    explanation: string;
  }>;
};
type BubblePopData = {
  rounds: Array<{ prompt: string; correctAnswer: string; decoys: string[] }>;
};
type SentenceBuilderData = {
  sentences: Array<{ hint: string; correctOrder: string[]; extraWords?: string[] }>;
};

type GameBase = {
  title: string;
  subject: string;
  instructions: string;
  finalChallenges?: Challenge[];
};

type Game =
  | (GameBase & { gameType: "memoryMatch"; data: MemoryGameData })
  | (GameBase & { gameType: "quizQuest"; data: QuizQuestData })
  | (GameBase & { gameType: "bubblePop"; data: BubblePopData })
  | (GameBase & { gameType: "sentenceBuilder"; data: SentenceBuilderData });

type GameStats =
  | { kind: "memory"; moves: number; durationMs: number }
  | { kind: "quiz"; score: number; total: number }
  | { kind: "scored"; score: number; total: number; durationMs: number };

type FinalStats = { correct: number; total: number };

type Phase = "playing" | "transition" | "challenge" | "done";

export default function PlayPage() {
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [phase, setPhase] = useState<Phase>("playing");
  const [gameStats, setGameStats] = useState<GameStats | null>(null);
  const [finalStats, setFinalStats] = useState<FinalStats | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("currentGame");
    if (!raw) {
      router.replace("/");
      return;
    }
    try {
      setGame(JSON.parse(raw));
    } catch {
      router.replace("/");
    }
  }, [router]);

  function onGameWon(stats: GameStats) {
    setGameStats(stats);
    // If we have finalChallenges, go to transition → challenge phase
    if (game?.finalChallenges && game.finalChallenges.length > 0) {
      setPhase("transition");
      setTimeout(() => setPhase("challenge"), 1800);
    } else {
      setPhase("done");
    }
  }

  function onChallengeDone(stats: FinalStats) {
    setFinalStats(stats);
    setPhase("done");
  }

  if (!game) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-spin text-4xl">🎲</div>
      </main>
    );
  }

  if (phase === "transition") {
    return <TransitionScreen />;
  }

  if (phase === "challenge" && game.finalChallenges && game.finalChallenges.length > 0) {
    return (
      <main className="min-h-screen px-4 py-6">
        <FinalChallenge
          challenges={game.finalChallenges}
          onDone={onChallengeDone}
        />
      </main>
    );
  }

  if (phase === "done") {
    return (
      <WinScreen
        game={game}
        gameStats={gameStats}
        finalStats={finalStats}
        onRestart={() => router.push("/")}
      />
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:py-10">
      <div className="max-w-md mx-auto">
        <button
          onClick={() => router.push("/")}
          className="text-sm text-brand-700 mb-4 inline-flex items-center gap-1 hover:underline"
        >
          ← Nouveau devoir
        </button>

        <div className="flex gap-2 mb-3 flex-wrap">
          <div className="inline-block px-3 py-1 bg-brand-100 text-brand-700 text-xs font-semibold rounded-full uppercase tracking-wide">
            {subjectLabel(game.subject)}
          </div>
          <div className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full uppercase tracking-wide">
            {gameTypeLabel(game.gameType)}
          </div>
          {game.finalChallenges && game.finalChallenges.length > 0 && (
            <div className="inline-block px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full uppercase tracking-wide">
              + 🎯 {game.finalChallenges.length} défi{game.finalChallenges.length > 1 ? "s" : ""}
            </div>
          )}
        </div>

        <Mascot title={game.title} instructions={game.instructions} autoPlay />

        {game.gameType === "memoryMatch" && (
          <MemoryGame
            pairs={game.data.pairs}
            onWin={(s) => onGameWon({ kind: "memory", moves: s.moves, durationMs: s.durationMs })}
          />
        )}
        {game.gameType === "quizQuest" && (
          <QuizQuest
            story={game.data.story}
            questions={game.data.questions}
            onWin={(s) => onGameWon({ kind: "quiz", score: s.score, total: s.total })}
          />
        )}
        {game.gameType === "bubblePop" && (
          <BubblePop
            rounds={game.data.rounds}
            onWin={(s) => onGameWon({ kind: "scored", score: s.score, total: s.total, durationMs: s.durationMs })}
          />
        )}
        {game.gameType === "sentenceBuilder" && (
          <SentenceBuilder
            sentences={game.data.sentences}
            onWin={(s) => onGameWon({ kind: "scored", score: s.score, total: s.total, durationMs: s.durationMs })}
          />
        )}
      </div>
    </main>
  );
}

function TransitionScreen() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 text-center">
      <div className="animate-pop">
        <div className="text-7xl mb-4 animate-bob">🦊</div>
        <h2 className="text-2xl font-bold text-brand-700 mb-2">Génial !</h2>
        <p className="text-slate-600 max-w-xs mx-auto">
          Maintenant, place à <span className="font-bold text-amber-600">l'épreuve finale</span> :
          réponds à la vraie question du devoir ! 🎯
        </p>
      </div>
    </main>
  );
}

function subjectLabel(s: string) {
  switch (s) {
    case "vocabulary": return "Vocabulaire";
    case "math": return "Maths";
    case "lesson": return "Leçon";
    case "conjugation": return "Conjugaison";
    default: return "Devoir";
  }
}

function gameTypeLabel(g: string) {
  switch (g) {
    case "memoryMatch": return "🎴 Mémoire";
    case "quizQuest": return "🗺️ Aventure";
    case "bubblePop": return "🫧 Bulles";
    case "sentenceBuilder": return "📝 Phrase";
    default: return "Jeu";
  }
}

function WinScreen({
  game,
  gameStats,
  finalStats,
  onRestart,
}: {
  game: Game;
  gameStats: GameStats | null;
  finalStats: FinalStats | null;
  onRestart: () => void;
}) {
  let headline = "Bravo !";
  let gameLine = "";

  if (gameStats?.kind === "memory") {
    const seconds = Math.round(gameStats.durationMs / 1000);
    gameLine = `🎴 ${gameStats.moves} coups en ${seconds}s`;
    const perfect = game.gameType === "memoryMatch" ? game.data.pairs.length : 0;
    if (gameStats.moves <= perfect + 2) headline = "Mémoire de champion ! 🏆";
    else if (gameStats.moves <= perfect * 2) headline = "Très bien joué ! ⭐";
  }
  if (gameStats?.kind === "quiz") {
    gameLine = `🗺️ ${gameStats.score} / ${gameStats.total} bonnes réponses`;
    const ratio = gameStats.score / gameStats.total;
    if (ratio === 1) headline = "Sans-faute ! 🏆";
    else if (ratio >= 0.7) headline = "Belle aventure ! ⭐";
  }
  if (gameStats?.kind === "scored") {
    const seconds = Math.round(gameStats.durationMs / 1000);
    gameLine = `⭐ ${gameStats.score} points en ${seconds}s`;
    if (gameStats.score >= gameStats.total * 10) headline = "Score parfait ! 🏆";
    else if (gameStats.score >= gameStats.total * 7) headline = "Super joueur ! ⭐";
  }

  const finalRatio = finalStats ? finalStats.correct / finalStats.total : null;
  let mastery: { label: string; emoji: string; color: string } | null = null;
  if (finalRatio !== null) {
    if (finalRatio === 1) mastery = { label: "Acquis !", emoji: "🌟", color: "text-emerald-600" };
    else if (finalRatio >= 0.5) mastery = { label: "En cours…", emoji: "💪", color: "text-amber-600" };
    else mastery = { label: "À retravailler", emoji: "📚", color: "text-rose-600" };
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center animate-pop">
        <div className="text-7xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-brand-700 mb-2">{headline}</h2>
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{game.title}</p>

        {/* Score panels */}
        <div className="my-5 space-y-2">
          {gameLine && (
            <div className="bg-violet-50 border border-brand-200 rounded-xl p-3 text-sm">
              <div className="text-xs uppercase tracking-wide text-brand-700 mb-0.5">Le jeu</div>
              <div className="font-semibold text-slate-800">{gameLine}</div>
            </div>
          )}
          {finalStats && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
              <div className="text-xs uppercase tracking-wide text-amber-700 mb-0.5">L'épreuve du devoir</div>
              <div className="font-semibold text-slate-800">
                🎯 {finalStats.correct} / {finalStats.total} bonnes réponses
              </div>
              {mastery && (
                <div className={`mt-1 font-bold ${mastery.color}`}>
                  {mastery.emoji} {mastery.label}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <button
            onClick={onRestart}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-4 rounded-2xl shadow active:scale-[0.98] transition"
          >
            Faire un autre devoir
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-white border border-brand-200 text-brand-700 font-semibold py-3 rounded-2xl"
          >
            Rejouer ce jeu
          </button>
        </div>
      </div>
    </main>
  );
}
