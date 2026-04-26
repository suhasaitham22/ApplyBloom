import { describe, it, expect } from "vitest";
import {
  setValue, findInputByLabel, autoFillProfile, extractUnansweredQuestions,
  LABEL_PATTERNS,
} from "../lib/form-fill";

function makeDoc(html: string): Document {
  const p = new DOMParser();
  return p.parseFromString(`<html><body>${html}</body></html>`, "text/html");
}

describe("form-fill", () => {
  it("setValue sets value + dispatches input+change", () => {
    const doc = makeDoc('<input id="x" />');
    const input = doc.getElementById("x") as HTMLInputElement;
    let events: string[] = [];
    input.addEventListener("input", () => events.push("input"));
    input.addEventListener("change", () => events.push("change"));
    setValue(input, "hello");
    expect(input.value).toBe("hello");
    expect(events).toEqual(["input", "change"]);
  });

  it("findInputByLabel matches by for id", () => {
    const doc = makeDoc('<label for="fn">First name</label><input id="fn" />');
    const el = findInputByLabel(doc, LABEL_PATTERNS.legal_first_name);
    expect(el?.id).toBe("fn");
  });

  it("findInputByLabel matches nested input", () => {
    const doc = makeDoc("<label>Last name<input /></label>");
    const el = findInputByLabel(doc, LABEL_PATTERNS.legal_last_name);
    expect(el).not.toBeNull();
  });

  it("findInputByLabel returns null when nothing matches", () => {
    const doc = makeDoc("<label>Favorite color<input /></label>");
    const el = findInputByLabel(doc, LABEL_PATTERNS.email);
    expect(el).toBeNull();
  });

  it("autoFillProfile fills known fields only", () => {
    const doc = makeDoc(
      '<label for="fn">First name</label><input id="fn" />' +
      '<label for="em">Email</label><input id="em" />' +
      '<label for="fav">Favorite color</label><input id="fav" />'
    );
    const filled = autoFillProfile(doc, {
      legal_first_name: "Suhas", email: "a@b.com", legal_last_name: null,
    });
    expect(filled.sort()).toEqual(["email", "legal_first_name"]);
    expect((doc.getElementById("fn") as HTMLInputElement).value).toBe("Suhas");
    expect((doc.getElementById("em") as HTMLInputElement).value).toBe("a@b.com");
    expect((doc.getElementById("fav") as HTMLInputElement).value).toBe("");
  });

  it("extractUnansweredQuestions skips filled profile fields", () => {
    const doc = makeDoc(
      '<label for="fn">First name</label><input id="fn" />' +
      '<label for="why">Why us?</label><textarea id="why"></textarea>'
    );
    const qs = extractUnansweredQuestions(doc, ["legal_first_name"]);
    expect(qs).toHaveLength(1);
    expect(qs[0].question_text).toBe("Why us?");
  });

  it("extractUnansweredQuestions ignores fields already filled", () => {
    const doc = makeDoc(
      '<label for="why">Why us?</label><textarea id="why">already filled</textarea>'
    );
    const qs = extractUnansweredQuestions(doc);
    expect(qs).toHaveLength(0);
  });
});
