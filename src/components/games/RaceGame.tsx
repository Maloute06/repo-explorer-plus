import { useMemo } from "react";
import { clamp, makeRng, type MiniGameProps } from "@/lib/game-utils";
import { useClock, useFinishAt } from "@/lib/use-clock";
import { Avatar } from "@/components/PlayerChip";

export function RaceGame({ players, seed, onFinish }: MiniGameProps) {
  const sim = useMemo(() => {
    const rng = makeRng(seed);
    const racers = players.map((name) => ({
      name,
      finish: 24 + rng() * 12,
      wiggle: 0.05 + rng() * 0.12,
      freq: 0.6 + rng() * 1.4,
      phase: rng() * Math.PI * 2,
    }));
    const duration = Math.max(...racers.map((r) => r.finish)) + 2;
    const ranking = [...racers].sort((a, b) => a.finish - b.finish).map((r) => r.name);
    return { racers, duration, ranking };
  }, [players, seed]);

  const t = useClock();
  useFinishAt(t, sim.duration, () => onFinish(sim.ranking));

  const start = 2;
  return (
    <div className="panel p-4 sm:p-6">
      <div className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
        {sim.racers.map((r) => {
          const raw = clamp((t - start) / r.finish, 0, 1);
          const noise = Math.sin(t * r.freq + r.phase) * r.wiggle * (1 - raw);
          const p = clamp(raw + noise, 0, 1);
          const done = t - start >= r.finish;
          return (
            <div
              key={r.name}
              className="relative h-11 overflow-hidden rounded-lg border border-border bg-background/60"
            >
              <div className="absolute inset-y-0 right-0 w-1.5 bg-gold/70" />
              <div
                className="absolute top-1/2 flex -translate-y-1/2 items-center gap-2"
                style={{ left: `calc(${p * 88}% + 6px)` }}
              >
                <Avatar name={r.name} size={28} />
                <span className="max-w-28 truncate text-xs font-semibold sm:max-w-40 sm:text-sm">
                  {r.name}
                </span>
                {done && <span className="text-xs">🏁</span>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        Course automatique — accélérations, coups de mou et photo-finish.
      </p>
    </div>
  );
}
