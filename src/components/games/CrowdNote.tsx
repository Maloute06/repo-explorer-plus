export function CrowdNote({ total, shown, children }: { total: number; shown: number; children: string }) {
  return (
    <p className="mt-3 text-center text-sm text-muted-foreground">
      {children}
      {total > shown && (
        <span className="mt-1 block font-mono text-[11px] uppercase tracking-widest">
          {shown} visuels · {total} en jeu
        </span>
      )}
    </p>
  );
}
