import { FC } from "react";
import { useWalletConnected } from "../../hooks/wallet";

export interface IDisconnected {
  children:
    | JSX.Element
    | React.ReactElement

}
export const WalletDisconnected: FC<IDisconnected> = (props) => {

	if (!useWalletConnected()){
		return <>{props.children}</>;
	}

	return null;
};
