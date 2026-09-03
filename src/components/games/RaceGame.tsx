import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { clamp, makeRng, takeVisual, type MiniGameProps } from "@/lib/game-utils";
import { useClock, useFinishAt } from "@/lib/use-clock";
import { GameStage, Hud } from "./GameStage";
import { imgCourse } from "./images";
import type { Racer3DState } from "./Race3D";

const Race3D = lazy(() => import("./Race3D"));

export function RaceGame({ players, seed, onFinish }: MiniGameProps) {
  const sim = useMemo(() => {
    const rng = makeRng(seed);
    const racers = players.map((name) => ({
      name,
      finish: 24 + rng() * 12,
      wiggle: 0.05 + rng() * 0.12,
      freq: 0.6 + rng() * 1.4,
      phase: rng() * Math.PI * 2,
      lane: rng() * 2 - 1,
    }));
    const duration = Math.max(...racers.map((r) => r.finish)) + 2;
    const ranking = [...racers].sort((a, b) => a.finish - b.finish).map((r) => r.name);
    return { racers, duration, ranking, visual: takeVisual(racers, 40) };
  }, [players, seed]);

  const t = useClock();
  useFinishAt(t, sim.duration, () => onFinish(sim.ranking));

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const start = 2;
  const done = sim.racers.filter((r) => t - start >= r.finish).length;
  const remaining = Math.max(0, Math.ceil(sim.duration - t));

  const states: Racer3DState[] = sim.visual.map((r) => {
    const raw = clamp((t - start) / r.finish, 0, 1);
    const noise = Math.sin(t * r.freq + r.phase) * r.wiggle * (1 - raw);
    return {
      name: r.name,
      p: clamp(raw + noise, 0, 1),
      lane: clamp(r.lane + Math.sin(t * r.freq * 0.7 + r.phase) * 0.25, -1, 1),
      arrived: t - start >= r.finish,
    };
  });

  const live = useMemo(() => [...states].sort((a, b) => b.p - a.p), [states]);
  const ranks = useMemo(() => {
    const map: Record<string, number> = {};
    live.forEach((s, i) => (map[s.name] = i + 1));
    return map;
  }, [live]);

  return (
    <GameStage
      full
      image={imgCourse}
      title="Course folle"
      subtitle="Piste 3D · caméra poursuite · photo-finish"
      aspect="auto"
      status={
        <>
          <Hud tone="live">
            {done}/{players.length} arrivés
          </Hud>
          {live[0] && <Hud tone="gold">🥇 {live[0].name}</Hud>}
          <Hud tone="muted">{remaining}s</Hud>
        </>
      }
    >
      {mounted && (
        <Suspense
          fallback={
            <div className="flex h-full w-full items-center justify-center font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Chargement de la piste 3D…
            </div>
          }
        >
          <div className="absolute inset-0">
            <Race3D racers={states} ranks={ranks} leadP={live[0]?.p ?? 0} />
          </div>
        </Suspense>
      )}

      <div className="pointer-events-none absolute right-3 top-3 z-30 w-52 rounded-xl border border-border/70 bg-background/70 p-3 backdrop-blur-md sm:w-60">
        <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          <span>Classement live</span>
          <span>{players.length}</span>
        </div>
        <ol className="space-y-1">
          {live.slice(0, 10).map((s, i) => (
            <li
              key={s.name}
              className="flex items-center gap-2 rounded-md px-1.5 py-1 font-mono text-[11px]"
              style={{ background: i === 0 ? "oklch(0.72 0.14 95 / 14%)" : "oklch(1 0 0 / 4%)" }}
            >
              <span
                className="w-4 shrink-0 text-right font-semibold"
                style={{ color: i === 0 ? "var(--color-gold)" : "var(--color-muted-foreground)" }}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate">{s.name}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {s.arrived ? "🏁" : `${Math.round(s.p * 100)}%`}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </GameStage>
  );
}
