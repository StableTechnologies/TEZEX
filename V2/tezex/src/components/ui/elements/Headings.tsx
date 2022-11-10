import { FC } from "react";

export interface IHeading {
  children: string
}
export const AppTitle: FC<IHeading> = (props) => {

  return (
    <h1
    >{props.children}</h1>
  );
};

