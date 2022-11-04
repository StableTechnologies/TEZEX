import { FC } from "react";
import { useSession } from "../../hooks/session";

export const WalletDisconnected: FC = (props) => {
	const session = useSession();

	if (!session.isWalletConnected) {
		return <>{props.children}</>;
	}

	return null;
};
