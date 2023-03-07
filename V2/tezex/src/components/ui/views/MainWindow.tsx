import React, { FC } from "react";
import { Box } from "@mui/system";

export interface IMainWindow {
  children:
    | JSX.Element[]
    | JSX.Element
    | React.ReactElement
    | React.ReactElement[]
    | string;
}

export const MainWindow: FC<IMainWindow> = (props) => {
  return (
    <Box
      sx={{
        height: "100%",
        background: "#F5F5F5",
      }}
    >
      {props.children}
    </Box>
  );
};
