import { FC } from "react";
import React, { useEffect } from "react";
import connectWallet from "../../functions/wallet";
export const Wallet: FC = () => {
	const onSubmit = async () => {
		await connectWallet();
	};
	return 	<button onClick={onSubmit}>Connect Wallet</button>;

};
