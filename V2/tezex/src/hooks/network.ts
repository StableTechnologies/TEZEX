import { useContext } from "react";
import { NetworkContext, INetwork } from "../contexts/network";

export function useNetwork(): INetwork {
  const network = useContext(NetworkContext);
  return network;
}
