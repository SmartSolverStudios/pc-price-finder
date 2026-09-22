import { TriangleAlert } from "lucide-react";

export function ScraperErrors({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm">
      <div className="flex items-center gap-2 font-medium text-warning">
        <TriangleAlert className="size-4" aria-hidden />
        The last scan reported {errors.length} error{errors.length === 1 ? "" : "s"}
      </div>
      <ul className="mt-2 list-disc space-y-0.5 pl-6 text-muted-foreground">
        {errors.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </div>
  );
}
