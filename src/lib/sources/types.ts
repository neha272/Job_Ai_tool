export type BoardType = "greenhouse" | "lever" | "ashby";

// One shape all three ATS boards normalize into.
export interface NormalizedPosting {
  source: BoardType;
  externalId: string;
  company: string;
  title: string;
  location: string | null;
  url: string;
  applyUrl: string | null;
  descriptionHtml: string;
  descriptionPlain: string;
}
