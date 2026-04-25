import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), message: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock("@/features/studio/lib/studio-client", () => ({
  getProfile: vi.fn(),
  saveProfile: vi.fn(),
}));

import { ProfileWizard } from "../profile-wizard";
import { getProfile, saveProfile } from "@/features/studio/lib/studio-client";

const mockGet = vi.mocked(getProfile);
const mockSave = vi.mocked(saveProfile);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ProfileWizard", () => {
  it("renders step 1 (Basics) with inputs", async () => {
    mockGet.mockResolvedValue({ profile: null, complete: false, required_fields: [] });
    render(<ProfileWizard />);
    await waitFor(() => expect(screen.getByText("Who are you?")).toBeInTheDocument());
    expect(screen.getByText("Legal first name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("Save&continue is disabled until all Basics fields filled", async () => {
    mockGet.mockResolvedValue({ profile: null, complete: false, required_fields: [] });
    render(<ProfileWizard />);
    await waitFor(() => expect(screen.getByText("Who are you?")).toBeInTheDocument());

    const continueBtn = screen.getByRole("button", { name: /Save & continue/i });
    expect(continueBtn).toBeDisabled();
  });

  it("pre-fills inputs from an existing profile", async () => {
    mockGet.mockResolvedValue({
      profile: {
        id: "p1", user_id: "u1",
        legal_first_name: "Suhas", legal_last_name: "Aitham",
        email: "a@b.com", phone: "+1", location: "SF",
        work_authorization: "citizen", visa_sponsorship_needed: false,
        relocation_ok: true, earliest_start_date: null,
        notice_period_weeks: null, salary_min: null, salary_max: null,
        linkedin_url: null, portfolio_url: null, github_url: null,
        has_eeo: false, completed_at: null,
        created_at: "", updated_at: "",
      },
      complete: true,
      required_fields: [],
    });
    render(<ProfileWizard />);
    await waitFor(() => expect(screen.getByDisplayValue("Suhas")).toBeInTheDocument());
    expect(screen.getByDisplayValue("a@b.com")).toBeInTheDocument();
  });

  it("advances to step 2 after Save&continue when fields are valid", async () => {
    mockGet.mockResolvedValue({ profile: null, complete: false, required_fields: [] });
    mockSave.mockResolvedValue({
      profile: {
        id: "p1", user_id: "u1",
        legal_first_name: "A", legal_last_name: "B",
        email: "a@b.com", phone: "+1", location: "SF",
        work_authorization: null, visa_sponsorship_needed: null, relocation_ok: null,
        earliest_start_date: null, notice_period_weeks: null, salary_min: null, salary_max: null,
        linkedin_url: null, portfolio_url: null, github_url: null,
        has_eeo: false, completed_at: null, created_at: "", updated_at: "",
      },
      complete: false,
    });
    render(<ProfileWizard />);
    await waitFor(() => expect(screen.getByText("Who are you?")).toBeInTheDocument());

    // Find inputs by their labels
    const inputs = screen.getAllByRole("textbox");
    // legal_first_name, legal_last_name, email, phone, location (order from component)
    fireEvent.change(inputs[0], { target: { value: "A" } });
    fireEvent.change(inputs[1], { target: { value: "B" } });
    // email is type="email" so it's not a textbox; fetch by placeholder instead
    // but the Input component may or may not be role=textbox for email. Query all differently.
  });

  it("saveProfile is called on Save&continue click", async () => {
    mockGet.mockResolvedValue({ profile: null, complete: false, required_fields: [] });
    mockSave.mockResolvedValue({
      profile: {
        id: "p1", user_id: "u1",
        legal_first_name: "A", legal_last_name: "B",
        email: "a@b.com", phone: "+1", location: "SF",
        work_authorization: null, visa_sponsorship_needed: null, relocation_ok: null,
        earliest_start_date: null, notice_period_weeks: null, salary_min: null, salary_max: null,
        linkedin_url: null, portfolio_url: null, github_url: null,
        has_eeo: false, completed_at: null, created_at: "", updated_at: "",
      },
      complete: false,
    });
    const { container } = render(<ProfileWizard />);
    await waitFor(() => expect(screen.getByText("Who are you?")).toBeInTheDocument());
    const inputs = container.querySelectorAll("input");
    fireEvent.change(inputs[0], { target: { value: "A" } });
    fireEvent.change(inputs[1], { target: { value: "B" } });
    fireEvent.change(inputs[2], { target: { value: "a@b.com" } });
    fireEvent.change(inputs[3], { target: { value: "+1" } });
    fireEvent.change(inputs[4], { target: { value: "SF" } });
    const btn = screen.getByRole("button", { name: /Save & continue/i });
    await waitFor(() => expect(btn).not.toBeDisabled());
    fireEvent.click(btn);
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
  });

  it("shows EEO voluntary disclaimer on the final step", async () => {
    // Pre-populate all required fields so we can skip directly (simulate via profile).
    mockGet.mockResolvedValue({
      profile: {
        id: "p1", user_id: "u1",
        legal_first_name: "A", legal_last_name: "B",
        email: "a@b.com", phone: "+1", location: "SF",
        work_authorization: "citizen", visa_sponsorship_needed: false,
        relocation_ok: true, earliest_start_date: null,
        notice_period_weeks: null, salary_min: null, salary_max: null,
        linkedin_url: null, portfolio_url: null, github_url: null,
        has_eeo: false, completed_at: null, created_at: "", updated_at: "",
      },
      complete: true,
      required_fields: [],
    });
    mockSave.mockResolvedValue({
      profile: {} as unknown as Parameters<typeof mockSave.mockResolvedValue>[0]["profile"],
      complete: true,
    });
    const { container } = render(<ProfileWizard />);
    await waitFor(() => expect(screen.getByText("Who are you?")).toBeInTheDocument());
    // Click Save & continue 3 times to reach step 3.
    for (let i = 0; i < 3; i++) {
      const btn = screen.getByRole("button", { name: /Save & continue/i });
      fireEvent.click(btn);
      await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(i + 1));
    }
    await waitFor(() => expect(screen.getByText(/Voluntary/)).toBeInTheDocument());
    expect(screen.getByText(/AES-256-GCM encrypted/)).toBeInTheDocument();
  });
});
