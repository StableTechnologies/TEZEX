import { FC } from "react";
import { useSession } from "../../hooks/session";

export interface IDisconnected {
  children:
    | JSX.Element
    | React.ReactElement

}
export const WalletDisconnected: FC<IDisconnected> = (props) => {
	const session = useSession();

	if (!session.isWalletConnected) {
		return <>{props.children}</>;
	}

	return null;
};
