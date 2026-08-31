import { useMemo } from "react";
import { makeRng, type MiniGameProps } from "@/lib/game-utils";
import { useClock, useFinishAt } from "@/lib/use-clock";
import { Avatar } from "@/components/PlayerChip";

const ROUND = 5.5;
const CHESTS = 3;

interface Round {
  picks: Record<string, number>;
  trapped: number;
  eliminated: string[];
  survivors: string[];
}

export function ChestGame({ players, seed, onFinish }: MiniGameProps) {
  const sim = useMemo(() => {
    const rng = makeRng(seed + 7);
    let alive = [...players];
    const rounds: Round[] = [];
    const eliminationOrder: string[] = [];

    while (alive.length > 1 && rounds.length < 14) {
      const picks: Record<string, number> = {};
      alive.forEach((n) => (picks[n] = Math.floor(rng() * CHESTS)));
      const trapped = Math.floor(rng() * CHESTS);
      let eliminated = alive.filter((n) => picks[n] === trapped);
      if (eliminated.length === alive.length) eliminated = eliminated.slice(1);
      const survivors = alive.filter((n) => !eliminated.includes(n));
      eliminated.forEach((n) => eliminationOrder.push(n));
      rounds.push({ picks, trapped, eliminated, survivors });
      alive = survivors;
    }

    const ranking = [...alive, ...eliminationOrder.reverse()];
    return { rounds, ranking, duration: rounds.length * ROUND + 2.5 };
  }, [players, seed]);

  const t = useClock();
  useFinishAt(t, sim.duration, () => onFinish(sim.ranking));

  const index = Math.min(Math.floor(t / ROUND), sim.rounds.length - 1);
  const round = sim.rounds[index]!;
  const inRound = t - index * ROUND;
  const revealed = inRound > 2.8;

  return (
    <div className="panel p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="tag">Manche {index + 1} / {sim.rounds.length}</span>
        <span className="font-mono text-xs text-muted-foreground">
          {revealed ? "Ouverture des coffres..." : "Les viewers choisissent..."}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: CHESTS }).map((_, c) => {
          const isTrap = revealed && round.trapped === c;
          const names = Object.keys(round.picks).filter((n) => round.picks[n] === c);
          return (
            <div
              key={c}
              className="rounded-xl border border-border p-3 transition-colors"
              style={{
                background: revealed
                  ? isTrap
                    ? "oklch(0.577 0.245 27.3 / 25%)"
                    : "oklch(0.633 0.079 115.2 / 22%)"
                  : "oklch(0.164 0.016 210.9 / 70%)",
              }}
            >
              <div className="text-center text-3xl">{revealed ? (isTrap ? "💀" : "💎") : "🎁"}</div>
              <div className="mt-1 text-center font-display text-lg">Coffre {c + 1}</div>
              <div className="mt-2 flex flex-wrap justify-center gap-1">
                {names.map((n) => (
                  <Avatar key={n} name={n} size={24} dimmed={revealed && isTrap} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 min-h-6 text-center text-sm">
        {revealed && round.eliminated.length > 0 && (
          <span className="text-destructive">
            Éliminés : {round.eliminated.join(", ")}
          </span>
        )}
        {revealed && round.eliminated.length === 0 && (
          <span className="text-muted-foreground">Personne ne tombe cette manche !</span>
        )}
      </div>
    </div>
  );
}
