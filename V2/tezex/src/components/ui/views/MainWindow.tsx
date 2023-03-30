import React, { FC } from "react";
import { Box } from "@mui/system";

import style from "./style";

export interface IMainWindow {
  children:
    | JSX.Element[]
    | JSX.Element
    | React.ReactElement
    | React.ReactElement[]
    | string;
}

export const MainWindow: FC<IMainWindow> = (props) => {
  return <Box sx={style.mainWindow}>{props.children}</Box>;
};
