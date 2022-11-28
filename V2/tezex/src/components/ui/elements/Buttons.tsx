import { FC } from "react";

export interface ITransact {
	walletTransaction: () => Promise<void>;
	children: string ;
}

export const Transact: FC<ITransact> = (props) => {
	const transact = async () => {
		await props.walletTransaction();
	};
	return (
		<div>
			<button onClick={transact}>{props.children}</button>
		</div>
	);
};
