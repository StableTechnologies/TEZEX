import { FC } from "react";
import { BigNumber } from 'bignumber.js' ;

export interface ITokenAmountInput {
	setAmount: React.Dispatch<React.SetStateAction<BigNumber | null>>;
	children: string | never[];
}

export const TokenAmountInput: FC<ITokenAmountInput> = (props) => {

	const updateAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
		const num = new BigNumber(e.target.value);
		(num.isNaN()) ? props.setAmount(null) : props.setAmount(new BigNumber(e.target.value));
		}
	
	return (
		<div>
			<input
				type="number"
				id="amountOfCurrency"
				name="amountOfCurrency"
				className="input-currency"
				onChange={updateAmount}
			></input>

			<label
				htmlFor="amountOfCurrency"
				className="input-currency"
			>
				{props.children}
			</label>
		</div>
	);
};
