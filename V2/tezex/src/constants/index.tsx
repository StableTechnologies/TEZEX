import { TokenKind, Asset, Transaction } from "../types/general";
import tzbtcLogo from "../assets/tzbtcLogo.svg";
import tzlogo from "../assets/tzlogo.svg";
import sirsLogo from "../assets/sirsLogo.svg";
export const assets: Asset[] = [
  {
    name: TokenKind.XTZ,
    label: "Tez",
    logo: tzlogo,
    address: "",
  },
  {
    name: TokenKind.TzBTC,
    label: TokenKind.TzBTC as string,
    logo: tzbtcLogo,
    address: "KT1PWx2mnDueood7fEmfbBDKx1D9BAnnXitn",
  },
  {
    name: TokenKind.Sirius,
    label: "Sirs",
    logo: sirsLogo,
    address: "KT1AafHA1C1vk959wvHWBispY9Y2f3fxBUUo",
  },
];

export const XTZ: Asset = assets[0];
export const TzBTC = assets[1];
export const SIRS = assets[2];

export const getDex = (transaction: Transaction): string => {
  const sirius = "KT1TxqZ8QtKvLu3V3JH7Gx58n7Co8pgtpQU5";
  return sirius;
};
export function getAsset(token: TokenKind): Asset {
  switch (token) {
    case TokenKind.TzBTC:
      return TzBTC;
    case TokenKind.XTZ:
      return XTZ;
    case TokenKind.Sirius:
      return SIRS;
  }
}
