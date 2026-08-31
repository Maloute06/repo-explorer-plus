import { useMemo } from "react";
import {
  clamp,
  lastStandingRanking,
  makeRng,
  pickDuration,
  takeVisual,
  type MiniGameProps,
} from "@/lib/game-utils";
import { useClock, useFinishAt } from "@/lib/use-clock";
import { Avatar } from "@/components/PlayerChip";
import { CrowdNote } from "./CrowdNote";

const RAILS = 4;

export function TrainSwitchGame({ players, seed, onFinish }: MiniGameProps) {
  const sim = useMemo(() => {
    const rng = makeRng(seed + 404);
    const duration = pickDuration(rng, 45, 60, players.length);
    const trains = players.map((name) => {
      const switches = [0.28, 0.52, 0.76].map((at) => ({
        at,
        from: Math.floor(rng() * RAILS),
        survive: rng() > 0.38,
      }));
      const doomed = switches.find((s) => !s.survive);
      return {
        name,
        rail: Math.floor(rng() * RAILS),
        finish: duration * (0.7 + rng() * 0.25),
        dieAt: doomed ? doomed.at * duration : duration + 5,
      };
    });
    const alive = trains.filter((tr) => tr.dieAt > duration).sort((a, b) => a.finish - b.finish);
    const dead = trains.filter((tr) => tr.dieAt <= duration).sort((a, b) => a.dieAt - b.dieAt);
    const ranking =
      alive.length > 0
        ? lastStandingRanking(
            alive.map((tr) => tr.name),
            dead.map((tr) => tr.name),
          )
        : lastStandingRanking(
            [dead[dead.length - 1]!.name],
            dead.slice(0, -1).map((tr) => tr.name),
          );
    return { trains, duration, ranking, visual: takeVisual(trains, 48) };
  }, [players, seed]);

  const t = useClock();
  useFinishAt(t, sim.duration, () => onFinish(sim.ranking));
  const progress = clamp(t / sim.duration, 0, 1);

  return (
    <div className="panel p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <span className="tag">Aiguillages</span>
        <span className="font-mono text-xs text-muted-foreground">{Math.round(progress * 100)}%</span>
      </div>
      <div className="space-y-3">
        {Array.from({ length: RAILS }).map((_, rail) => (
          <div
            key={rail}
            className="relative h-14 overflow-hidden rounded-lg border border-border bg-background/60"
          >
            <div className="absolute inset-y-3 inset-x-2 border-y border-dashed border-primary/30" />
            <div
              className="absolute top-1/2 h-0.5 w-10 -translate-y-1/2 bg-gold"
              style={{ left: `${18 + ((rail + Math.floor(t * 2)) % 3) * 22}%` }}
            />
            {sim.visual
              .filter((tr) => tr.rail === rail)
              .map((tr) => {
                const dead = t >= tr.dieAt;
                const p = clamp(t / tr.finish, 0, 1);
                return (
                  <div
                    key={tr.name}
                    className="absolute top-1/2 -translate-y-1/2"
                    style={{
                      left: `${dead ? p * 40 : p * 86}%`,
                      top: dead ? "120%" : "50%",
                      opacity: dead ? 0.35 : 1,
                    }}
                  >
                    <Avatar name={tr.name} size={24} dimmed={dead} />
                  </div>
                );
              })}
          </div>
        ))}
      </div>
      <CrowdNote total={players.length} shown={sim.visual.length}>
        Les rails changent sans prévenir. Un mauvais aiguillage et c'est terminé.
      </CrowdNote>
    </div>
  );
}
