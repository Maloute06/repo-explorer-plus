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

export function TornadoGame({ players, seed, onFinish }: MiniGameProps) {
  const sim = useMemo(() => {
    const rng = makeRng(seed + 707);
    const duration = pickDuration(rng, 30, 60, players.length);
    const order = shuffle(players, rng);
    const winner = order[order.length - 1]!;
    const eliminated = order.slice(0, -1);
    const interval = (duration - 4) / Math.max(eliminated.length, 1);
    const units = players.map((name) => ({
      name,
      x: rng(),
      y: rng(),
      wander: 0.1 + rng() * 0.2,
      phase: rng() * 10,
      death: eliminated.indexOf(name) >= 0 ? 1.8 + eliminated.indexOf(name) * interval : duration + 8,
    }));
    return {
      units,
      duration,
      ranking: lastStandingRanking([winner], eliminated),
      visual: takeVisual(units),
    };
  }, [players, seed]);

  const t = useClock();
  useFinishAt(t, sim.duration, () => onFinish(sim.ranking));
  const tx = 0.5 + Math.sin(t * 0.85) * 0.34;
  const ty = 0.5 + Math.cos(t * 0.62) * 0.28;
  const dead = new Set(sim.units.filter((u) => t >= u.death).map((u) => u.name));

  return (
    <div className="panel p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <span className="tag">Ne reste pas immobile</span>
        <span className="font-mono text-xs text-muted-foreground">
          {players.length - dead.size} encore debout
        </span>
      </div>
      <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl border border-border bg-background/70">
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `${tx * 100}%`,
            top: `${ty * 100}%`,
            width: "28%",
            height: "28%",
            background:
              "radial-gradient(circle, oklch(0.743 0.045 118 / 55%), oklch(0.371 0.083 320 / 15%) 55%, transparent 70%)",
            boxShadow: "0 0 50px oklch(0.371 0.083 320 / 45%)",
          }}
        />
        {sim.visual.map((u) => {
          const out = dead.has(u.name);
          let x = clamp(u.x + Math.sin(t * u.wander + u.phase) * 0.28, 0.04, 0.96);
          let y = clamp(u.y + Math.cos(t * u.wander * 1.1 + u.phase) * 0.24, 0.04, 0.96);
          if (out) {
            x += (tx - x) * 0.7;
            y += (ty - y) * 0.7;
          }
          return (
            <div
              key={u.name}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x * 100}%`, top: `${y * 100}%`, opacity: out ? 0.25 : 1 }}
            >
              <Avatar name={u.name} size={22} dimmed={out} />
            </div>
          );
        })}
      </div>
      <CrowdNote total={players.length} shown={sim.visual.length}>
        La tornade se déplace et aspire tout sur son passage.
      </CrowdNote>
    </div>
  );
}
