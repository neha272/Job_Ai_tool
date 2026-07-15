import type { BoardType, NormalizedPosting } from "./types";
import { fetchGreenhouse } from "./greenhouse";
import { fetchLever } from "./lever";
import { fetchAshby } from "./ashby";

export async function fetchPostings(
  boardType: BoardType,
  token: string,
): Promise<NormalizedPosting[]> {
  switch (boardType) {
    case "greenhouse":
      return fetchGreenhouse(token);
    case "lever":
      return fetchLever(token);
    case "ashby":
      return fetchAshby(token);
    default:
      throw new Error(`Unknown board type: ${boardType}`);
  }
}
