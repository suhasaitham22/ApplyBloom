import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NotificationList } from "../notification-list";

describe("NotificationList", () => {
  it("renders the empty state", () => {
    render(<NotificationList />);

    expect(screen.getByText("No notifications.")).toBeInTheDocument();
  });
});
