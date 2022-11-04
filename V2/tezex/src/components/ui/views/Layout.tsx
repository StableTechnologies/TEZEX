import { FC, HTMLAttributes } from "react";
import { AppTitle } from "../elements/Headings";
import { Wallet } from "../../wallet/Wallet";
import { Header } from "./Header";
import { MainWindow } from "./MainWindow";
export const Layout: FC = (props) => {
	return (
		<div>
			<Header />
			<MainWindow>{props.children}</MainWindow>
		</div>
	);
};
