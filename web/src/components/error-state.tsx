import { TriangleAlert } from "lucide-react";

export function ErrorState({
  title = "Unable to load build data.",
  message = "The scraper output could not be read.",
  detail,
}: {
  title?: string;
  message?: string;
  detail?: string;
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
      <span className="inline-flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-5" aria-hidden />
      </span>
      <h2 className="text-base font-medium">{title}</h2>
      <p className="text-sm text-muted-foreground">{message}</p>
      {detail && (
        <pre className="mt-2 w-full overflow-x-auto rounded-md bg-muted/50 p-3 text-left font-mono text-xs whitespace-pre-wrap text-muted-foreground">
          {detail}
        </pre>
      )}
    </div>
  );
}
