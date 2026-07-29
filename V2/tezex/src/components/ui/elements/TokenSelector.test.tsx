import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { Asset, Token, TokenType } from "../../../types/general";
import { TokenSelector } from "./TokenSelector";

const makeAsset = (name: Token, label: string): Asset => ({
  name,
  label,
  logo: `/${name}.svg`,
  address: "",
  decimals: 6,
  type: TokenType.FA12,
});

const tez = makeAsset(Token.XTZ, "Tez");
const tzbtc = makeAsset(Token.TzBTC, "tzBTC");
const usdtz = makeAsset(Token.USDtz, "USDtz");

test("selects a token from inside an amount field", () => {
  const handleChange = jest.fn();

  render(
    <TokenSelector
      asset={tzbtc}
      options={[tzbtc, usdtz]}
      onChange={handleChange}
      ariaLabel="Select you receive"
    />
  );

  const selector = screen.getByRole("combobox", {
    name: "Select you receive",
  });
  expect(selector).toHaveTextContent("tzBTC");

  fireEvent.mouseDown(selector);
  fireEvent.click(screen.getByRole("option", { name: "USDtz" }));

  expect(handleChange).toHaveBeenCalledWith(usdtz);
});

test("shows the selected token label without replacing the supplied artwork", () => {
  render(
    <TokenSelector
      asset={tez}
      options={[tez]}
      onChange={jest.fn()}
      ariaLabel="Select you pay"
    />
  );

  expect(
    screen.getByRole("combobox", { name: "Select you pay" })
  ).toHaveTextContent("Tez");
  expect(document.querySelector('[data-token="XTZ"]')).toBeInTheDocument();
});
