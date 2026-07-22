import React from "react";
import { act, render, screen } from "@testing-library/react";

import style from "./style";
import { TransactionProgress } from "./TransactionProgress";

jest.mock("@mui/material/useMediaQuery", () => () => false);

describe("TransactionProgress", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("waits for the rail to arrive before activating the next stage", () => {
    const styles = style(null, 1);
    const { rerender } = render(
      <TransactionProgress statusStep={1} styles={styles} />
    );

    expect(
      screen.getByRole("listitem", { name: "Request: in progress" })
    ).toHaveAttribute("aria-current", "step");

    rerender(<TransactionProgress statusStep={2} styles={styles} />);

    expect(
      screen.getByRole("listitem", { name: "Request: complete" })
    ).not.toHaveAttribute("aria-current");
    expect(
      screen.getByRole("listitem", { name: "Swap: not started" })
    ).not.toHaveAttribute("aria-current");

    act(() => {
      jest.advanceTimersByTime(519);
    });

    expect(
      screen.getByRole("listitem", { name: "Swap: not started" })
    ).not.toHaveAttribute("aria-current");

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(
      screen.getByRole("listitem", { name: "Swap: in progress" })
    ).toHaveAttribute("aria-current", "step");

    rerender(<TransactionProgress statusStep={3} styles={styles} />);

    expect(
      screen.getByRole("listitem", { name: "Swap: complete" })
    ).not.toHaveAttribute("aria-current");
    expect(
      screen.getByRole("listitem", { name: "Complete: not started" })
    ).not.toHaveAttribute("aria-current");

    act(() => {
      jest.advanceTimersByTime(520);
    });

    expect(
      screen.getByRole("listitem", { name: "Complete: complete" })
    ).not.toHaveAttribute("aria-current");
  });

  it("retracts to Request after a failed swap so the flow can restart", () => {
    const styles = style(null, 1);
    const { rerender } = render(
      <TransactionProgress statusStep={1} styles={styles} />
    );

    rerender(<TransactionProgress statusStep={2} styles={styles} />);
    act(() => {
      jest.advanceTimersByTime(520);
    });

    expect(
      screen.getByRole("listitem", { name: "Swap: in progress" })
    ).toHaveAttribute("aria-current", "step");
    expect(screen.getByTestId("progress-track-fill")).toHaveStyle(
      "width: 41.6667%"
    );

    rerender(<TransactionProgress statusStep={1} styles={styles} />);

    expect(
      screen.getByRole("listitem", { name: "Request: in progress" })
    ).toHaveAttribute("aria-current", "step");
    expect(
      screen.getByRole("listitem", { name: "Swap: not started" })
    ).not.toHaveAttribute("aria-current");
    expect(screen.getByTestId("progress-track-fill")).toHaveStyle(
      "width: 8.3334%"
    );
  });
});
