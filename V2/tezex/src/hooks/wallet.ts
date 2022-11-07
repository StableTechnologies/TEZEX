import { useContext } from "react";
import { WalletContext , WalletInfo } from "../contexts/wallet";

export function useWallet() {
  const wallet = useContext(WalletContext);

  return wallet;
}
 
