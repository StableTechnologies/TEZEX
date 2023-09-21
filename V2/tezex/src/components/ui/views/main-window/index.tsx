import React, { FC } from "react";
import { Box } from "@mui/system";

import style from "./style";
import useStyles from "../../../../hooks/styles";
import sidelogo from "../../../../assets/sidelogo.svg";
import { SideBar } from "../sidebar";
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
    <Box
      sx={{
        height: "100%",
        width: "100%",
        position: "relative",
        alignContent: "flex-start",
        alignItems: "flex-start",

        flexDirection: "row",
        justifyContent: "center",
        display: "flex",
      }}
    >
      <Box
        sx={{
          height: "70%",
          justifyContent: "center",
          display: "flex",
          alignContent: "center",
          position: "absolute",
          alignItems: "flex-start",
          left: "2%",
          top: "2%",

          "@media (max-width: 900px) and (orientation: landscape)": {
            display: "none",
          },

          "@media screen and (max-width: 768px)": {
            display: "none",
          },
        }}
      >
        {" "}
        <img src={sidelogo} />{" "}
      </Box>
      {props.children}
    </Box>
  );
};
/* return (
    <Box sx={styles.mainWindow}>
      <Box sx={styles.mainWindowBackground}>
        {" "}
        <img src={sidelogo} />{" "}
      </Box>

      {props.children}
    </Box>
  );*/
