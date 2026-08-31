import { useMemo } from "react";
import { clamp, makeRng, shuffle, type MiniGameProps } from "@/lib/game-utils";
import { useClock, useFinishAt } from "@/lib/use-clock";
import { Avatar } from "@/components/PlayerChip";

export function ExplosionGame({ players, seed, onFinish }: MiniGameProps) {
  const sim = useMemo(() => {
    const rng = makeRng(seed + 21);
    const order = shuffle(players, rng);
    const eliminationOrder = order.slice(0, Math.max(order.length - 1, 0));
    const interval = clamp(45 / Math.max(eliminationOrder.length, 1), 1.2, 4.5);
    const duration = 2 + eliminationOrder.length * interval + 2.5;
    const ranking = [order[order.length - 1], ...[...eliminationOrder].reverse()].filter(
      (n): n is string => Boolean(n),
    );
    return { order, eliminationOrder, interval, duration, ranking };
  }, [players, seed]);

  const t = useClock();
  useFinishAt(t, sim.duration, () => onFinish(sim.ranking));

  const blown = Math.max(0, Math.min(sim.eliminationOrder.length, Math.floor((t - 2) / sim.interval) + 1));
  const dead = new Set(sim.eliminationOrder.slice(0, blown));
  const fuse = clamp(((t - 2) % sim.interval) / sim.interval, 0, 1);

  return (
    <div className="panel p-4 sm:p-6">
      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between">
          <span className="tag">Mèche</span>
          <span className="font-mono text-xs text-muted-foreground">
            {sim.order.length - dead.size} survivants
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-background">
          <div
            className="h-full bg-destructive"
            style={{ width: `${(1 - fuse) * 100}%`, transition: "width 0.08s linear" }}
          />
        </div>
      </div>

      <div className="grid max-h-[24rem] grid-cols-4 gap-3 overflow-y-auto sm:grid-cols-6 lg:grid-cols-8">
        {sim.order.map((name) => {
          const out = dead.has(name);
          const justOut = sim.eliminationOrder[blown - 1] === name && fuse < 0.25;
          return (
            <div
              key={name}
              className="flex flex-col items-center gap-1 rounded-lg border border-border bg-background/60 p-2"
              style={{ opacity: out ? 0.4 : 1 }}
            >
              <div className="relative">
                <Avatar name={name} size={34} dimmed={out} />
                {out && (
                  <span className={`absolute -right-2 -top-2 text-lg ${justOut ? "animate-pop" : ""}`}>
                    💥
                  </span>
                )}
              </div>
              <span className="w-full truncate text-center text-[11px]">{name}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        Mode explosion : la bombe saute à intervalles réguliers. Le dernier debout gagne.
      </p>
    </div>
  );
}
