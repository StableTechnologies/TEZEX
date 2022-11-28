import { FC, useState } from "react";

import { BigNumber } from "bignumber.js";
import { CurrencyInput} from "../../ui/elements/Inputs";
import { Transact} from "../../ui/elements/Buttons";

export interface ISwapToken {
	children: null;
}
export const SwapXTZToToken: FC= (props) => {
	const [amountOfXTZ, setAmountOfXTZ] = useState<BigNumber | null>(null);

	return (
		<div>
			<h3>{"Buy Token"}</h3>
			<CurrencyInput setAmount={setAmountOfXTZ}>
			</CurrencyInput>

		</div>
	);
};
