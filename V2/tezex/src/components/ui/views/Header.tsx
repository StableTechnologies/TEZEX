import { FC } from "react";
import { AppTitle } from "../elements/Headings";
import { Wallet } from "../../wallet/Wallet";
export const Header: FC = () => {
	return (
		<div>
			<header>
				<div>
					<AppTitle>TEZEX</AppTitle>
				</div>
				<div>
					<Wallet />
				</div>
			</header>
		</div>
	);
};
export {};
