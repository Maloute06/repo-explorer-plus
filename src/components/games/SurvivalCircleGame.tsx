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

export function SurvivalCircleGame({ players, seed, onFinish }: MiniGameProps) {
  const sim = useMemo(() => {
    const rng = makeRng(seed + 303);
    const duration = pickDuration(rng, 60, 90, players.length);
    const order = shuffle(players, rng);
    const winner = order[order.length - 1]!;
    const eliminated = order.slice(0, -1);
    const interval = (duration - 6) / Math.max(eliminated.length, 1);
    const units = players.map((name) => ({
      name,
      ang: rng() * Math.PI * 2,
      orbit: 0.18 + rng() * 0.28,
      spin: 0.4 + rng() * 0.9,
      death: eliminated.indexOf(name) >= 0 ? 3 + eliminated.indexOf(name) * interval : duration + 10,
    }));
    return {
      units,
      duration,
      ranking: lastStandingRanking([winner], eliminated),
      visual: takeVisual(units),
      events: [
        { at: duration * 0.25, label: "Tempête de zone" },
        { at: duration * 0.5, label: "Salve aléatoire" },
        { at: duration * 0.75, label: "Le cercle se referme" },
      ],
    };
  }, [players, seed]);

  const t = useClock();
  useFinishAt(t, sim.duration, () => onFinish(sim.ranking));
  const radius = clamp(1 - (t - 2) / (sim.duration - 4), 0.12, 1);
  const dead = new Set(sim.units.filter((u) => t >= u.death).map((u) => u.name));
  const event = [...sim.events].reverse().find((e) => t >= e.at);

  return (
    <div className="panel p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="tag">{event?.label ?? "Zone ouverte"}</span>
        <span className="font-mono text-xs text-muted-foreground">
          {players.length - dead.size} survivants
        </span>
      </div>
      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-background/70">
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-destructive/70"
          style={{
            width: `${radius * 88}%`,
            height: `${radius * 88}%`,
            boxShadow: "0 0 40px oklch(0.577 0.245 27.3 / 35%)",
          }}
        />
        {sim.visual.map((u) => {
          const out = dead.has(u.name);
          const r = out ? u.orbit * 1.15 : u.orbit * radius * 1.6 + 0.04;
          const a = u.ang + t * u.spin;
          return (
            <div
              key={u.name}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${50 + Math.cos(a) * r * 100}%`,
                top: `${50 + Math.sin(a) * r * 100}%`,
                opacity: out ? 0.3 : 1,
              }}
            >
              <Avatar name={u.name} size={22} dimmed={out} />
            </div>
          );
        })}
      </div>
      <CrowdNote total={players.length} shown={sim.visual.length}>
        L'arène rétrécit. Il faut tenir jusqu'à ce qu'il n'en reste plus qu'un.
      </CrowdNote>
    </div>
  );
}
