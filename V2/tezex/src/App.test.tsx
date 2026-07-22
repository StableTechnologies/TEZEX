import React from "react";
import { render, screen } from "@testing-library/react";
import App from "./App";

jest.mock("./components/ui/views", () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <main data-testid="app-layout">{children}</main>
  ),
}));

jest.mock("react-router-dom", () => ({
  Outlet: () => <div>Route content</div>,
}));

jest.mock("react-device-detect", () => ({
  useMobileOrientation: () => ({ isLandscape: false }),
}));

test("renders the application layout when the orientation API is unavailable", () => {
  render(<App />);

  expect(screen.getByTestId("app-layout")).toBeInTheDocument();
  expect(screen.getByText("Route content")).toBeInTheDocument();
});
