export const STATUSES = [
  "found",
  "tailoring",
  "pending_review",
  "approved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
] as const;

export type Status = (typeof STATUSES)[number];

// The happy-path pipeline shown in the horizontal tracker. rejected/withdrawn
// are terminal states rendered separately.
export const PIPELINE: Status[] = [
  "found",
  "tailoring",
  "pending_review",
  "approved",
  "applied",
  "interviewing",
  "offer",
];

export const STATUS_LABEL: Record<Status, string> = {
  found: "Found",
  tailoring: "Tailoring",
  pending_review: "Review",
  approved: "Approved",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

// Full literal class strings so Tailwind v4 generates each bg-stage-* utility.
export const STAGE_DOT_CLASS: Record<Status, string> = {
  found: "bg-stage-found",
  tailoring: "bg-stage-tailoring",
  pending_review: "bg-stage-pending-review",
  approved: "bg-stage-approved",
  applied: "bg-stage-applied",
  interviewing: "bg-stage-interviewing",
  offer: "bg-stage-offer",
  rejected: "bg-stage-closed",
  withdrawn: "bg-stage-closed-neutral",
};

export function stageIndex(s: Status): number {
  return PIPELINE.indexOf(s);
}

export function isTerminalNegative(s: Status): s is "rejected" | "withdrawn" {
  return s === "rejected" || s === "withdrawn";
}
