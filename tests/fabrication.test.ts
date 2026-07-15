import { describe, it, expect } from "vitest";
import { findFabrications, hasFabrications } from "@/lib/fabrication";

const baseFacts = JSON.stringify({
  properNouns: ["Jane Doe", "Acme Corp", "Python", "AWS"],
  numbers: ["40", "2021", "2023"],
});

describe("findFabrications", () => {
  it("passes honest tailoring that only reuses base facts", () => {
    const f = findFabrications(
      baseFacts,
      "Jane Doe at Acme Corp used Python; 40% gain in 2021.",
    );
    expect(f.properNouns).toEqual([]);
    expect(f.numbers).toEqual([]);
    expect(hasFabrications(f)).toBe(false);
  });

  it("flags a fabricated employer and metric", () => {
    const f = findFabrications(
      baseFacts,
      "Jane Doe at Google boosted revenue 99%.",
    );
    expect(f.properNouns).toContain("Google");
    expect(f.numbers).toContain("99");
    expect(hasFabrications(f)).toBe(true);
  });

  it("does not flag a multi-word phrase whose words all exist in the base", () => {
    // "Acme" and "Corp" are both in the base, in different phrases here.
    const f = findFabrications(baseFacts, "Worked at Acme, later Corp systems.");
    expect(f.properNouns).not.toContain("Acme");
    expect(f.properNouns).not.toContain("Corp");
  });

  it("tolerates null and invalid baseFacts without throwing", () => {
    // With no base facts the base word-set is empty, so ANY capitalized token
    // or number would be flagged (the safe direction). Use text with neither.
    expect(findFabrications(null, "all lowercase text, no caps")).toEqual({
      properNouns: [],
      numbers: [],
    });
    expect(
      findFabrications("not valid json", "still lowercase and numberless"),
    ).toEqual({ properNouns: [], numbers: [] });
  });
});
