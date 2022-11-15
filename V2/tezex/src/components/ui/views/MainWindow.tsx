import { FC } from "react";

export interface IMainWindow {
  children:
    | JSX.Element[]
    | JSX.Element
    | React.ReactElement
    | React.ReactElement[]
    | string
}

export const MainWindow: FC<IMainWindow> = (props) => {
  return (
    <div>
      {props.children}
    </div>
  );
};
