import React, { FC } from "react";
import { Wallet } from "../../wallet/Wallet";
import { NavApp } from "../../nav";

import Box from "@mui/material/Box";
import logo from "../../../assets/TezexLogo.svg";

import style from "./style";

export const Header: FC = () => {
  return (
    <Box sx={style.header.headerBox}>
      <Box>
        <img style={style.header.logo} src={logo} alt="Logo" />
      </Box>

      <Box sx={style.header.nav}>
        <NavApp />
      </Box>
      <Box sx={style.header.wallet}>
        <Wallet variant={"header"} />
      </Box>
    </Box>
  );
};
export {};
