"use client";

import { useEffect, useMemo, useState } from "react";

type Pair = { left: string; right: string };
type Card = { id: number; pairId: number; text: string; side: "L" | "R" };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MemoryGame({
  pairs,
  onWin,
}: {
  pairs: Pair[];
  onWin: (stats: { moves: number; durationMs: number }) => void;
}) {
  const cards = useMemo<Card[]>(() => {
    const list: Card[] = [];
    pairs.forEach((p, i) => {
      list.push({ id: i * 2, pairId: i, text: p.left, side: "L" });
      list.push({ id: i * 2 + 1, pairId: i, text: p.right, side: "R" });
    });
    return shuffle(list);
  }, [pairs]);

  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [wrong, setWrong] = useState<number[]>([]);
  const [startedAt] = useState(() => Date.now());

  useEffect(() => {
    if (flipped.length !== 2) return;
    const [aId, bId] = flipped;
    const a = cards.find((c) => c.id === aId)!;
    const b = cards.find((c) => c.id === bId)!;
    setMoves((m) => m + 1);
    if (a.pairId === b.pairId && a.side !== b.side) {
      setMatched((m) => new Set(m).add(a.pairId));
      setTimeout(() => setFlipped([]), 420);
    } else {
      setWrong([aId, bId]);
      setTimeout(() => {
        setFlipped([]);
        setWrong([]);
      }, 900);
    }
  }, [flipped, cards]);

  useEffect(() => {
    if (matched.size === pairs.length && pairs.length > 0) {
      const t = setTimeout(() => onWin({ moves, durationMs: Date.now() - startedAt }), 700);
      return () => clearTimeout(t);
    }
  }, [matched, pairs.length, moves, startedAt, onWin]);

  function onCardClick(card: Card) {
    if (flipped.length >= 2) return;
    if (flipped.includes(card.id)) return;
    if (matched.has(card.pairId)) return;
    setFlipped([...flipped, card.id]);
  }

  const cols = 4;

  return (
    <div>
      <div className="flex justify-between items-center mb-4 text-sm">
        <div className="bg-white rounded-full px-3 py-1.5 shadow-sm border border-brand-100">
          <span className="font-bold text-brand-700">{matched.size}</span>
          <span className="text-slate-500"> / {pairs.length} paires</span>
        </div>
        <div className="bg-white rounded-full px-3 py-1.5 shadow-sm border border-brand-100 text-slate-600">
          🎯 <span className="font-bold">{moves}</span>
        </div>
      </div>

      <div
        className="grid gap-2 sm:gap-3"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {cards.map((card) => {
          const isRevealed = flipped.includes(card.id) || matched.has(card.pairId);
          const isWrong = wrong.includes(card.id);
          const isMatched = matched.has(card.pairId);
          return (
            <button
              key={card.id}
              onClick={() => onCardClick(card)}
              disabled={isMatched}
              aria-label={isRevealed ? card.text : "Carte cachée"}
              className={`aspect-square w-full rounded-2xl shadow-md select-none transition-transform duration-200 active:scale-95 ${
                isWrong ? "animate-shake" : ""
              } ${isMatched ? "opacity-60" : ""}`}
            >
              <div
                className={`w-full h-full rounded-2xl flex items-center justify-center text-center p-1.5 transition-all duration-150 ${
                  isRevealed
                    ? isMatched
                      ? "bg-emerald-100 text-emerald-800 border-[3px] border-emerald-400 animate-pop"
                      : "bg-white text-slate-800 border-[3px] border-brand-300 animate-pop"
                    : "bg-gradient-to-br from-brand-500 to-brand-700 text-white border-[3px] border-transparent"
                }`}
              >
                {isRevealed ? (
                  <span className="text-sm sm:text-base font-bold leading-tight break-words">
                    {card.text}
                  </span>
                ) : (
                  <span className="text-3xl sm:text-4xl">?</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
