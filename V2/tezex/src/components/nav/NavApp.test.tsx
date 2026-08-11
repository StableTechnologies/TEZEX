import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { NavApp } from "./NavApp";

jest.mock("../../hooks/styles", () => () => ({ navApp: {} }));

jest.mock("../../hooks/session", () => ({
  useSession: () => ({
    appConfig: { aboutRedirectUrl: "https://example.com/about" },
  }),
}));

const CurrentLocation = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

const renderNavigation = (initialPath: string) =>
  render(
    <MemoryRouter
      initialEntries={[initialPath]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route
          path="*"
          element={
            <>
              <NavApp />
              <CurrentLocation />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );

test("marks the current primary destination without using a body-style pill", () => {
  renderNavigation("/analytics");

  expect(screen.getByRole("tab", { name: "Analytics" })).toHaveAttribute(
    "aria-current",
    "page"
  );
  expect(screen.getByRole("tab", { name: "Analytics" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  expect(screen.getByRole("tab", { name: "Home" })).not.toHaveAttribute(
    "aria-current"
  );
});

test("navigates between primary destinations", () => {
  renderNavigation("/stez");

  fireEvent.click(screen.getByRole("tab", { name: "Home" }));

  expect(screen.getByTestId("location")).toHaveTextContent(
    "/swap/xtz-to-tzbtc"
  );
});

test("does not mark Home active on the not-found route", () => {
  renderNavigation("/missing");

  expect(screen.getByRole("tab", { name: "Home" })).toHaveAttribute(
    "aria-selected",
    "false"
  );
  expect(screen.getByRole("tab", { name: "Home" })).not.toHaveAttribute(
    "aria-current"
  );
});
