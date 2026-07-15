// Plain (non-"use server") module so these types can be shared between the
// server actions and the client components without violating the rule that a
// "use server" file may only export async functions.

export interface ActionResult {
  ok: boolean;
  message: string;
}

export interface ResumeSaveResult extends ActionResult {
  facts?: { properNouns: number; numbers: number };
}
