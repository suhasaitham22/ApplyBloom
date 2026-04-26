import { describe, it, expect } from "vitest";
import { buildFillPlan, PROFILE_KEYS } from "../lib/fill-plan";

function makeDoc(html: string): Document {
  const p = new DOMParser();
  return p.parseFromString(`<html><body>${html}</body></html>`, "text/html");
}

describe("buildFillPlan", () => {
  it("fills profile and surfaces remaining questions", () => {
    const doc = makeDoc(
      '<label for="fn">First name</label><input id="fn" />' +
      '<label for="em">Email</label><input id="em" />' +
      '<label for="why">Why us?</label><textarea id="why"></textarea>'
    );
    const plan = buildFillPlan(doc, {
      legal_first_name: "X", legal_last_name: null, email: "x@y.com",
      phone: null, location: null, linkedin_url: null, portfolio_url: null, github_url: null,
    });
    expect(plan.filledKeys).toContain("legal_first_name");
    expect(plan.filledKeys).toContain("email");
    expect(plan.unansweredQuestions.map((q) => q.question_text)).toEqual(["Why us?"]);
  });

  it("exports PROFILE_KEYS", () => {
    expect(PROFILE_KEYS.length).toBeGreaterThan(0);
  });
});
