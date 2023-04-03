import React, { FC } from "react";
import { Header } from "./Header";
import { MainWindow } from "./MainWindow";
import Box from "@mui/material/Box";

import style from "./style";
import useStyles from "../../../hooks/styles";
export interface ILayout {
  children:
    | JSX.Element[]
    | JSX.Element
    | React.ReactElement
    | React.ReactElement[]
    | string;
}

export const Layout: FC<ILayout> = (props) => {
  const styles = useStyles(style);
  return (
    <Box sx={styles.layoutBox}>
      <Header />
      <Box sx={styles.layoutMainwindow}>
        <MainWindow>{props.children}</MainWindow>
      </Box>
    </Box>
  );
};
