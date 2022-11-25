import { FC } from "react";

import { CurrencyInput} from "../../ui/elements/Inputs";
export interface ISwapToken {
	children: null;
}
export const SwapXTZToToken: FC= (props) => {
	return (
		<div>
			<h3>{"Buy Token"}</h3>
			<CurrencyInput>
			</CurrencyInput>

		</div>
	);
};
