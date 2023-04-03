import React, { FC } from "react";
import { Box } from "@mui/system";

import style from "./style";
import useStyles from "../../../hooks/styles";

export interface IMainWindow {
  children:
    | JSX.Element[]
    | JSX.Element
    | React.ReactElement
    | React.ReactElement[]
    | string;
}

export const MainWindow: FC<IMainWindow> = (props) => {
  const styles = useStyles(style);
  return <Box sx={styles.mainWindow}>{props.children}</Box>;
};
