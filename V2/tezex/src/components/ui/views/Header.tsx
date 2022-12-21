import { FC } from "react";
import { AppTitle } from "../elements/Headings";
import { Wallet } from "../../wallet/Wallet";
import { Nav } from "../../nav";

export const Header: FC = () => {
	return (
		<div>
			<header>
				<div>
					<AppTitle>TEZEX</AppTitle>
				</div>
				<Nav />
				<div>
					<Wallet />
				</div>
			</header>
		</div>
	);
};
export {};
