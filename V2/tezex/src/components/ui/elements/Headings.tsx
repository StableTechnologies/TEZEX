import { FC, HTMLAttributes } from "react";

export const AppTitle: FC = (props) => {

  return (
    <h1
    >{props.children}</h1>
  );
};

