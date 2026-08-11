import React from "react";
import { render, screen } from "@testing-library/react";

import {
  AnalyticsLoadingState,
  BrandedLoader,
  TradingLoadingState,
} from "./TezexLoading";

describe("TEZEX loading states", () => {
  it("announces an indeterminate branded wait without exposing decoration", () => {
    render(<BrandedLoader label="Preparing exchange" />);

    expect(screen.getByRole("status")).toHaveTextContent("Preparing exchange");
    expect(screen.getByRole("status").querySelector("img")).toHaveAttribute(
      "alt",
      ""
    );
  });

  it("preserves the swap workspace while it initializes", () => {
    render(<TradingLoadingState variant="swap" />);

    expect(
      screen.getByRole("status", { name: "Preparing swap" })
    ).toBeVisible();
    expect(document.querySelectorAll(".tezex-loading-field")).toHaveLength(2);
    expect(
      document.querySelector(".tezex-trading-loading__context")
    ).toBeTruthy();
  });

  it("labels the analytics skeleton for assistive technology", () => {
    render(<AnalyticsLoadingState />);

    expect(
      screen.getByRole("status", { name: "Loading on-chain analytics" })
    ).toBeVisible();
    expect(
      document.querySelectorAll(".tezex-analytics-loading__row")
    ).toHaveLength(3);
  });
});
