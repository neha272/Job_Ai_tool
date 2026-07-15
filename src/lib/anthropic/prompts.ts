// Sentinels so the (backslash-heavy) LaTeX never has to survive JSON escaping —
// works reliably on both Claude and local models.
export const TEX_BEGIN = "===BEGIN RESUME TEX===";
export const TEX_END = "===END RESUME TEX===";
export const CHANGES_BEGIN = "===BEGIN CHANGES JSON===";
export const CHANGES_END = "===END CHANGES JSON===";

export const TAILOR_SYSTEM = `You are an expert résumé editor. You tailor a candidate's existing LaTeX résumé to a specific job description.

ABSOLUTE RULES — never violate these:
- You may ONLY reword, reorder, and re-emphasize content that already exists in the base résumé.
- NEVER invent or add an employer, job title, date, degree, certification, skill, tool, technology, or metric that is not already present in the base résumé. If the job wants something the candidate doesn't have, do not add it.
- Never change a factual number (dates, durations, quantities, percentages, GPAs) to a different value. You may keep, drop, or re-emphasize a real fact — never fabricate or inflate one.
- Preserve the LaTeX so it still compiles: keep the document class, packages, and any custom commands/macros. Only edit human-readable content (bullet wording, ordering, the summary, skills emphasis). Do not introduce packages that weren't already used.
- Keep the writing truthful, specific, and ATS-friendly.

Your task: make the candidate's REAL experience read as clearly relevant to this specific role. Reorder sections and bullets so the most relevant material comes first; reword bullets to mirror the job's language ONLY where the underlying fact already supports it; adjust emphasis. Return the complete revised LaTeX document, not a fragment.`;

export function buildTailorUserPrompt(baseTex: string, jobText: string): string {
  return [
    "Here is my base résumé (LaTeX source):",
    "",
    "<base_resume>",
    baseTex,
    "</base_resume>",
    "",
    "Here is the job description:",
    "",
    "<job_description>",
    jobText,
    "</job_description>",
    "",
    "Tailor my résumé to this job following every rule above.",
    "",
    "OUTPUT FORMAT — follow it exactly, output nothing else:",
    `${TEX_BEGIN}`,
    "<the COMPLETE revised LaTeX document here, raw — not inside JSON, not fenced>",
    `${TEX_END}`,
    `${CHANGES_BEGIN}`,
    '<a JSON array of the edits you made: [{"section":"...","what":"...","why":"..."}]>',
    `${CHANGES_END}`,
  ].join("\n");
}

export const FIX_LATEX_SYSTEM = `You fix LaTeX compilation errors. Change ONLY syntax and structure so the document compiles with Tectonic. Do NOT add, remove, or alter any résumé facts (employers, titles, dates, skills, numbers). Return the complete corrected LaTeX document.`;

export function buildFixPrompt(tex: string, errorLog: string): string {
  return [
    "This LaTeX failed to compile with Tectonic. Fix only the syntax/structure so it compiles — do not change any résumé facts.",
    "",
    "<error>",
    errorLog.slice(0, 6000),
    "</error>",
    "",
    "<latex>",
    tex,
    "</latex>",
    "",
    "OUTPUT FORMAT — follow it exactly, output nothing else:",
    `${TEX_BEGIN}`,
    "<the COMPLETE corrected LaTeX document here, raw>",
    `${TEX_END}`,
  ].join("\n");
}
