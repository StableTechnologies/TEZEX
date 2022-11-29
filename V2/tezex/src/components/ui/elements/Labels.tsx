import { FC } from "react";
import { BigNumber } from "bignumber.js";

export interface ICurrencyOutput {
	setAmount: React.Dispatch<React.SetStateAction<BigNumber | null>>;
	children: BigNumber | null;
}

export const CurrencyOutput: FC<ICurrencyOutput> = (props) => {
	return (
		<div>
			<label className="output-currency">
				{props.children
					? props.children.toString()
					: "0"}
			</label>
		</div>
	);
};
