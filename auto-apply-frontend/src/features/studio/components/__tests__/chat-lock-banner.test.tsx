import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatLockBanner } from "../chat-lock-banner";

describe("ChatLockBanner", () => {
  it("renders nothing when not running", () => {
    const { container } = render(<ChatLockBanner running={false} />);
    expect(container.firstChild).toBeNull();
  });
  it("shows lock message when running", () => {
    render(<ChatLockBanner running={true} />);
    expect(screen.getByText(/Automation is running/)).toBeInTheDocument();
  });
  it("Pause button invokes callback", () => {
    const onPause = vi.fn();
    render(<ChatLockBanner running={true} onPause={onPause} />);
    fireEvent.click(screen.getByRole("button", { name: /Pause/ }));
    expect(onPause).toHaveBeenCalledTimes(1);
  });
});
