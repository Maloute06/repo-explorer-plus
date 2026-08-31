import { useMemo } from "react";
import {
  clamp,
  lastStandingRanking,
  makeRng,
  pickDuration,
  shuffle,
  takeVisual,
  type MiniGameProps,
} from "@/lib/game-utils";
import { useClock, useFinishAt } from "@/lib/use-clock";
import { Avatar } from "@/components/PlayerChip";
import { CrowdNote } from "./CrowdNote";

export function BombArenaGame({ players, seed, onFinish }: MiniGameProps) {
  const sim = useMemo(() => {
    const rng = makeRng(seed + 606);
    const duration = pickDuration(rng, 45, 75, players.length);
    const order = shuffle(players, rng);
    const winner = order[order.length - 1]!;
    const eliminated = order.slice(0, -1);
    const interval = (duration - 5) / Math.max(eliminated.length, 1);
    const units = players.map((name) => ({
      name,
      x: rng(),
      y: rng(),
      vx: 0.08 + rng() * 0.18,
      vy: 0.06 + rng() * 0.16,
      phase: rng() * 8,
      death: eliminated.indexOf(name) >= 0 ? 2.4 + eliminated.indexOf(name) * interval : duration + 8,
    }));
    const blasts = Array.from({ length: 10 }, () => ({
      at: 2 + rng() * (duration - 8),
      x: rng(),
      y: rng(),
    }));
    return {
      units,
      blasts,
      duration,
      ranking: lastStandingRanking([winner], eliminated),
      visual: takeVisual(units),
    };
  }, [players, seed]);

  const t = useClock();
  useFinishAt(t, sim.duration, () => onFinish(sim.ranking));
  const dead = new Set(sim.units.filter((u) => t >= u.death).map((u) => u.name));

  return (
    <div className="panel p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <span className="tag">Bombes en rafale</span>
        <span className="font-mono text-xs text-muted-foreground">
          {players.length - dead.size} en vie
        </span>
      </div>
      <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl border border-border bg-background/70">
        {sim.blasts.map((b, i) => {
          const age = t - b.at;
          if (age < 0 || age > 1.4) return null;
          return (
            <div
              key={i}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-destructive/40"
              style={{
                left: `${b.x * 100}%`,
                top: `${b.y * 100}%`,
                width: `${12 + age * 70}%`,
                height: `${12 + age * 70}%`,
                opacity: 1 - age / 1.4,
              }}
            />
          );
        })}
        {sim.visual.map((u) => {
          const out = dead.has(u.name);
          const x = clamp(u.x + Math.sin(t * u.vx + u.phase) * 0.22, 0.05, 0.95);
          const y = clamp(u.y + Math.cos(t * u.vy + u.phase) * 0.2, 0.05, 0.95);
          return (
            <div
              key={u.name}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x * 100}%`, top: `${y * 100}%`, opacity: out ? 0.28 : 1 }}
            >
              <Avatar name={u.name} size={22} dimmed={out} />
            </div>
          );
        })}
      </div>
      <CrowdNote total={players.length} shown={sim.visual.length}>
        Le sol explose. Lis le terrain, reste en mouvement — le dernier survivant gagne.
      </CrowdNote>
    </div>
  );
}
