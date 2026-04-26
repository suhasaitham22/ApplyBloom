import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/studio/lib/studio-client", () => ({ answerPendingQA: vi.fn() }));

import { QAAnswerCard } from "../qa-answer-card";
import { answerPendingQA } from "@/features/studio/lib/studio-client";

const mockAnswer = vi.mocked(answerPendingQA);

function mk(overrides: Record<string, unknown> = {}) {
  return {
    id: "q1", apply_id: "a1", session_id: "s1",
    question_text: "Why us?", question_type: "long_text",
    suggested_answer: null, suggested_verdict: null,
    answer: null, answered_at: null, created_at: "",
    ...overrides,
  } as unknown as Parameters<typeof QAAnswerCard>[0]["item"];
}

beforeEach(() => vi.clearAllMocks());

describe("QAAnswerCard", () => {
  it("shows the question text", () => {
    render(<QAAnswerCard item={mk()} />);
    expect(screen.getByText("Why us?")).toBeInTheDocument();
  });
  it("submit disabled when answer empty", () => {
    render(<QAAnswerCard item={mk()} />);
    expect(screen.getByRole("button", { name: /Submit answer/ })).toBeDisabled();
  });
  it("pre-fills suggested answer", () => {
    render(<QAAnswerCard item={mk({ suggested_answer: "Because X" })} />);
    expect(screen.getByDisplayValue("Because X")).toBeInTheDocument();
  });
  it("shows 'Suggestion' badge when verdict = suggest", () => {
    render(<QAAnswerCard item={mk({ suggested_verdict: "suggest", suggested_answer: "X" })} />);
    expect(screen.getByText("Suggestion")).toBeInTheDocument();
  });
  it("calls answerPendingQA on submit + invokes onAnswered", async () => {
    const onAnswered = vi.fn();
    mockAnswer.mockResolvedValue({ item: mk({ answer: "x" }) });
    render(<QAAnswerCard item={mk()} onAnswered={onAnswered} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "my answer" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit answer/ }));
    await waitFor(() => expect(mockAnswer).toHaveBeenCalledWith("q1", "my answer"));
    await waitFor(() => expect(onAnswered).toHaveBeenCalled());
  });
});
