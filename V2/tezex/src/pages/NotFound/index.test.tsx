import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { NotFound } from ".";

describe("NotFound", () => {
  it("offers a clear route back into TEZEX", () => {
    render(
      <MemoryRouter initialEntries={["/missing-page"]}>
        <NotFound />
      </MemoryRouter>
    );

    expect(
      screen.getByRole("heading", { name: "Empty sector." })
    ).toBeInTheDocument();
    expect(screen.getByText("/missing-page")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "BACK TO SWAP" })).toHaveAttribute(
      "href",
      "/home/swap"
    );
    expect(
      screen.getByRole("img", {
        name: "Survey reticle centred on empty sky",
      })
    ).toBeInTheDocument();
  });
});
