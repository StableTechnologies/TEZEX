import { FC, useEffect, useState } from "react";
import { useWallet } from "../../../hooks/wallet";
import { WalletInfo } from "../../../contexts/wallet";

export interface ITransact {
	callback: () => Promise<void>;
	children: string ;
}

export const Transact: FC<ITransact> = (props) => {

	const [disabled, setDisabled] = useState(true);
	const walletInfo: WalletInfo | null = useWallet();

	const transact = async () => {
		await props.callback();
	};

	useEffect(() => {
		if (walletInfo) {
			(walletInfo.isReady()) ? setDisabled(false) : setDisabled(true);
			
		}
	}, [walletInfo]);
	
	return (
		<div>
			<button onClick={transact} disabled={disabled}>{props.children}</button>
		</div>
	);
};
