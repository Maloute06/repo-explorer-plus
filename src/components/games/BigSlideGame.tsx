import { useMemo } from "react";
import { clamp, makeRng, pickDuration, takeVisual, type MiniGameProps } from "@/lib/game-utils";
import { useClock, useFinishAt } from "@/lib/use-clock";
import { Avatar } from "@/components/PlayerChip";
import { CrowdNote } from "./CrowdNote";

export function BigSlideGame({ players, seed, onFinish }: MiniGameProps) {
  const sim = useMemo(() => {
    const rng = makeRng(seed + 202);
    const duration = pickDuration(rng, 30, 60, players.length);
    const sliders = players.map((name) => ({
      name,
      lane: rng(),
      finish: duration * (0.55 + rng() * 0.38),
      bump: 0.04 + rng() * 0.1,
      freq: 1.2 + rng() * 2.2,
      phase: rng() * Math.PI * 2,
    }));
    const ranking = [...sliders].sort((a, b) => a.finish - b.finish).map((s) => s.name);
    return { sliders, duration, ranking, visual: takeVisual(sliders, 80) };
  }, [players, seed]);

  const t = useClock();
  useFinishAt(t, sim.duration, () => onFinish(sim.ranking));

  return (
    <div className="panel p-4 sm:p-6">
      <div
        className="relative h-[28rem] overflow-hidden rounded-xl border border-border"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.371 0.083 320 / 35%), oklch(0.525 0.069 118.7 / 18%) 45%, oklch(0.633 0.079 115.2 / 28%))",
        }}
      >
        <div className="absolute inset-x-[8%] top-0 h-full border-x border-dashed border-primary/25" />
        <div className="absolute inset-x-0 bottom-0 h-3 bg-gold/70" />
        {sim.visual.map((s) => {
          const raw = clamp(t / s.finish, 0, 1);
          const x = clamp(s.lane + Math.sin(t * s.freq + s.phase) * s.bump, 0.04, 0.96);
          const done = t >= s.finish;
          return (
            <div
              key={s.name}
              className="absolute -translate-x-1/2"
              style={{ left: `${x * 100}%`, top: `${raw * 88}%` }}
            >
              <Avatar name={s.name} size={done ? 20 : 26} />
            </div>
          );
        })}
      </div>
      <CrowdNote total={players.length} shown={sim.visual.length}>
        Toboggan géant — tout le monde glisse, le premier en bas rafle la mise.
      </CrowdNote>
    </div>
  );
}
