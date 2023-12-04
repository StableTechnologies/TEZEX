import React, { FC } from "react";
import { Box } from "@mui/system";

import style from "./style";
import useStyles from "../../../../hooks/styles";
import sidelogo from "../../../../assets/sidelogo.svg";

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
  return (
    <Box sx={styles.root}>
      <Box sx={styles.sideLogo}>
        {" "}
        <img src={sidelogo} />{" "}
      </Box>
      {props.children}
    </Box>
  );
};
