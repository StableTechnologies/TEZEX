import { FC} from "react";
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
