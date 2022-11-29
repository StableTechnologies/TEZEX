import { FC } from "react";
import { BigNumber } from "bignumber.js";

export interface ICurrencyOutput {
	denomination: string;
	children: number | BigNumber | null;
}

export const CurrencyOutput: FC<ICurrencyOutput> = (props) => {
	return (
		<div>
			<label className="output-currency">
				{props.children
					? props.children.toString()
					: "0"}
			</label>
			<label className="output-currency-label">
				{props.denomination}
			</label>
		</div>
	);
};
