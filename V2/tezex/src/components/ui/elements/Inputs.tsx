import { FC } from "react";
import { BigNumber } from 'bignumber.js' ;

export interface ICurrencyInput {
	setAmount: React.Dispatch<React.SetStateAction<BigNumber | null>>;
	children: string | never[];
}

export const CurrencyInput: FC<ICurrencyInput> = (props) => {

	const updateAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
		const num = new BigNumber(e.target.value);
		(num.isNaN()) ? props.setAmount(null) : props.setAmount(new BigNumber(e.target.value));
		}
	
	return (
		<div>
			<label
				htmlFor="amountOfCurrency"
				className="input-currency"
			>
				{props.children}
			</label>
			<input
				type="number"
				id="amountOfCurrency"
				name="amountOfCurrency"
				className="input-currency"
				onChange={updateAmount}
			></input>
		</div>
	);
};
