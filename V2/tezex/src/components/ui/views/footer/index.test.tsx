import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { Footer } from ".";

jest.mock("../../../../hooks/session", () => ({
  useSession: () => ({
    appConfig: { aboutRedirectUrl: "https://docs.tezex.io/about" },
  }),
}));

test("renders the site footer with working product and resource links", () => {
  render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Footer />
    </MemoryRouter>
  );

  expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "TEZEX home" })).toHaveAttribute(
    "href",
    "/home/swap"
  );
  expect(screen.getByRole("link", { name: "Swap" })).toHaveAttribute(
    "href",
    "/home/swap"
  );
  expect(screen.getByRole("link", { name: "Liquidity" })).toHaveAttribute(
    "href",
    "/home/add"
  );
  expect(screen.getByRole("link", { name: "Analytics" })).toHaveAttribute(
    "href",
    "/analytics"
  );
  expect(screen.getByRole("link", { name: "sTEZ" })).toHaveAttribute(
    "href",
    "/stez"
  );
  expect(screen.getByRole("link", { name: "Tezos" })).toHaveAttribute(
    "href",
    "https://tezos.com"
  );
  expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute(
    "href",
    "https://docs.tezex.io"
  );
  expect(screen.getByRole("link", { name: "TEZEX on GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/StableTechnologies/TEZEX"
  );
});
