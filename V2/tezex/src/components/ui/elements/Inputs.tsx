import { FC } from "react";

export interface ICurrencyInput {
	children: string | never[];
}

export const CurrencyInput: FC<ICurrencyInput> = (props) => {
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
			></input>
		</div>
	);
};
