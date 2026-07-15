import { cn } from "@/lib/utils";
import {
  PIPELINE,
  STAGE_DOT_CLASS,
  STATUS_LABEL,
  isTerminalNegative,
  stageIndex,
  type Status,
} from "@/lib/status";

// The signature element: a quiet horizontal stage tracker. Color concentrates
// on the active stage; done stages fade; upcoming stages are hollow. Every
// stage carries a text label, so color is reinforcement, never the sole signal.
export function StatusTracker({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  const neg = isTerminalNegative(status);
  const currentIdx = neg ? -1 : stageIndex(status);

  return (
    <ol
      className={cn(
        "flex flex-wrap items-center gap-y-2 text-xs",
        className,
      )}
      aria-label={`Application status: ${STATUS_LABEL[status]}`}
    >
      {PIPELINE.map((stage, i) => {
        const done = !neg && i < currentIdx;
        const current = !neg && i === currentIdx;
        return (
          <li key={stage} className="flex items-center">
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={cn(
                  "rounded-full",
                  current
                    ? cn("size-3 border border-transparent", STAGE_DOT_CLASS[stage])
                    : done
                      ? cn("size-2.5 border border-transparent opacity-55", STAGE_DOT_CLASS[stage])
                      : "size-2.5 border border-border bg-transparent",
                )}
              />
              <span
                className={cn(
                  current
                    ? "font-semibold text-foreground"
                    : done
                      ? "text-muted-foreground"
                      : "text-muted-foreground/70",
                )}
              >
                {STATUS_LABEL[stage]}
              </span>
            </span>
            {i < PIPELINE.length - 1 && (
              <span aria-hidden className="mx-2 h-px w-4 bg-border" />
            )}
          </li>
        );
      })}
      {neg && (
        <li className="ml-3">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              status === "rejected"
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground",
            )}
          >
            {STATUS_LABEL[status]}
          </span>
        </li>
      )}
    </ol>
  );
}
