import { FC } from "react";

export interface ITransact {
	callback: () => Promise<void>;
	children: string ;
}

export const Transact: FC<ITransact> = (props) => {
	const transact = async () => {
		await props.callback();
	};
	return (
		<div>
			<button onClick={transact}>{props.children}</button>
		</div>
	);
};
