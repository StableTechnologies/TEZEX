import { FC } from "react";
import { useWalletConnected } from "../../hooks/wallet";

export interface IConnected {
  children: JSX.Element | React.ReactElement;
}

export const WalletConnected: FC<IConnected> = (props) => {
  if (!useWalletConnected()) {
    return null;
  }

  return <>{props.children}</>;
};
