import { FC, HTMLAttributes } from "react";
import { AppTitle } from "../elements/Headings";
import { Wallet } from "../../wallet/Wallet";
import { Header } from "./Header";
import { MainWindow } from "./MainWindow";

export interface ILayout {
  children:
    | JSX.Element[]
    | JSX.Element
    | React.ReactElement
    | React.ReactElement[]
    | string
}

export const Layout: FC<ILayout> = (props) => {
	return (
		<div>
			<Header />
			<MainWindow>{props.children}</MainWindow>
		</div>
	);
};
