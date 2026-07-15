import { describe, it, expect } from "vitest";
import { parseGreenhouse } from "@/lib/sources/greenhouse";
import { parseLever } from "@/lib/sources/lever";
import { parseAshby } from "@/lib/sources/ashby";

describe("parseGreenhouse", () => {
  it("decodes entity-encoded content once and normalizes fields", () => {
    const data = {
      jobs: [
        {
          id: 123,
          title: "Data Analyst",
          location: { name: "Remote" },
          absolute_url: "https://boards.greenhouse.io/acme/jobs/123",
          content: "&lt;p&gt;Build &amp;amp; ship&lt;/p&gt;",
        },
      ],
    };
    const [p] = parseGreenhouse(data, "acme");
    expect(p.source).toBe("greenhouse");
    expect(p.externalId).toBe("123");
    expect(p.company).toBe("acme");
    expect(p.title).toBe("Data Analyst");
    expect(p.location).toBe("Remote");
    expect(p.url).toBe("https://boards.greenhouse.io/acme/jobs/123");
    // decoded exactly once → real HTML with a single literal ampersand
    expect(p.descriptionHtml).toBe("<p>Build &amp; ship</p>");
    expect(p.descriptionPlain).toBe("Build & ship");
  });

  it("handles missing content and empty payloads", () => {
    expect(parseGreenhouse({}, "acme")).toEqual([]);
    const [p] = parseGreenhouse(
      { jobs: [{ id: 1, title: "X", absolute_url: "u" }] },
      "acme",
    );
    expect(p.descriptionHtml).toBe("");
    expect(p.location).toBeNull();
  });
});

describe("parseLever", () => {
  it("maps text→title and categories.location, prefers descriptionPlain", () => {
    const data = [
      {
        id: "abc",
        text: "Backend Engineer",
        categories: { location: "New York" },
        hostedUrl: "https://jobs.lever.co/acme/abc",
        applyUrl: "https://jobs.lever.co/acme/abc/apply",
        description: "<div>Do <b>things</b></div>",
        descriptionPlain: "Do things",
      },
    ];
    const [p] = parseLever(data, "acme");
    expect(p.source).toBe("lever");
    expect(p.title).toBe("Backend Engineer");
    expect(p.location).toBe("New York");
    expect(p.url).toBe("https://jobs.lever.co/acme/abc");
    expect(p.applyUrl).toBe("https://jobs.lever.co/acme/abc/apply");
    expect(p.descriptionPlain).toBe("Do things");
  });

  it("returns [] for non-array payloads and falls back to hostedUrl", () => {
    expect(parseLever({}, "acme")).toEqual([]);
    const [p] = parseLever(
      [{ id: "1", text: "T", hostedUrl: "h", description: "<p>Hi</p>" }],
      "acme",
    );
    expect(p.applyUrl).toBe("h");
    expect(p.descriptionPlain).toBe("Hi");
  });
});

describe("parseAshby", () => {
  it("filters unlisted jobs and reads a string location", () => {
    const data = {
      jobs: [
        {
          id: "1",
          title: "ML Engineer",
          location: "Remote",
          jobUrl: "https://jobs.ashbyhq.com/acme/1",
          applyUrl: "https://jobs.ashbyhq.com/acme/1/application",
          descriptionHtml: "<p>Cool role</p>",
          descriptionPlain: "Cool role",
          isListed: true,
        },
        {
          id: "2",
          title: "Hidden",
          location: "X",
          jobUrl: "u2",
          descriptionHtml: "",
          isListed: false,
        },
      ],
    };
    const res = parseAshby(data, "acme");
    expect(res).toHaveLength(1);
    expect(res[0].title).toBe("ML Engineer");
    expect(res[0].location).toBe("Remote");
    expect(res[0].applyUrl).toContain("application");
  });
});
