import { FC } from "react";
import { Header } from "./Header";
import { MainWindow } from "./MainWindow";
import Box from "@mui/material/Box";

export interface ILayout {
  children:
    | JSX.Element[]
    | JSX.Element
    | React.ReactElement
    | React.ReactElement[]
    | string;
}

export const Layout: FC<ILayout> = (props) => {
  return (
    <Box sx={{ height: "100%" }}>
      <Header />
      <Box sx={{ height: "100vh" }}>
        <MainWindow>{props.children}</MainWindow>
      </Box>
    </Box>
  );
};
