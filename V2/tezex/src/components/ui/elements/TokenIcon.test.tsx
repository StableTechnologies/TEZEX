import React from "react";
import { render, screen } from "@testing-library/react";

import { Asset, Token, TokenType } from "../../../types/general";
import { TokenIcon, TokenPair } from "./TokenIcon";

const tez: Asset = {
  name: Token.XTZ,
  label: "Tez",
  logo: "/assets/tzlogo.svg",
  address: "",
  decimals: 6,
  type: TokenType.XTZ,
};

const tzbtc: Asset = {
  name: Token.TzBTC,
  label: "tzBTC",
  logo: "/assets/tzbtcLogo.svg",
  address: "KT1",
  decimals: 8,
  type: TokenType.FA12,
};

describe("TokenIcon", () => {
  it("leaves solid-bodied Tez undecorated", () => {
    render(<TokenIcon asset={tez} size={26} />);

    const icon = screen.getByRole("img", { name: "Tez" }).parentElement;
    expect(icon).toHaveAttribute("data-treatment", "");
    expect(icon).toHaveStyle({
      border: "none",
      boxShadow: "none",
      backgroundColor: "transparent",
    });
  });

  it("adds only a hairline to a standalone light-bodied token", () => {
    render(<TokenIcon asset={tzbtc} size={26} />);

    const icon = screen.getByRole("img", { name: "tzBTC" }).parentElement;
    expect(icon).toHaveAttribute("data-treatment", "hairline");
    expect(icon).toHaveStyle({
      border: "none",
      backgroundColor: "var(--tezex-token-light-body)",
      boxShadow: "inset 0 0 0 1px var(--tezex-token-hairline)",
    });
  });

  it("uses the exact underlying surface as the overlap cutout", () => {
    render(
      <TokenPair
        tokenA={tez}
        tokenB={tzbtc}
        size={28}
        surface="var(--tezex-panel-subtle)"
      />
    );

    const pair = screen.getByLabelText("Tez / tzBTC");
    const frontIcon = pair.querySelectorAll(".tezex-token-icon")[1];

    expect(frontIcon).toHaveAttribute("data-treatment", "hairline cutout");
    expect(frontIcon).toHaveStyle({
      border: "2.24px solid var(--tezex-panel-subtle)",
      marginLeft: "-7.840000000000001px",
    });
  });

  it("removes overlap decoration below 24 pixels", () => {
    render(<TokenPair tokenA={tez} tokenB={tzbtc} size={22} surface="#fff" />);

    const pair = screen.getByLabelText("Tez / tzBTC");
    const frontIcon = pair.querySelectorAll(".tezex-token-icon")[1];

    expect(frontIcon).toHaveAttribute("data-treatment", "hairline");
    expect(frontIcon).toHaveStyle({ border: "none", marginLeft: "0px" });
  });
});
