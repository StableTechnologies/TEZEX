import { useContext } from "react";
import { INetwork, NetworkContext } from "../contexts/network";

export const useNetwork = (): INetwork => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error("useNetwork must be used within NetworkProvider");
  }
  return context;
};
