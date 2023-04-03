import React, { FC } from "react";
import { Wallet } from "../../wallet/Wallet";
import { NavApp } from "../../nav";

import Box from "@mui/material/Box";
import logo from "../../../assets/TezexLogo.svg";

import style from "./style";
import useStyles from "../../../hooks/styles";

export const Header: FC = () => {
  const styles = useStyles(style);
  return (
    <Box sx={styles.header.headerBox}>
      <Box>
        <img style={styles.header.logo} src={logo} alt="Logo" />
      </Box>

      <Box sx={styles.header.nav}>
        <NavApp />
      </Box>
      <Box sx={styles.header.wallet}>
        <Wallet variant={"header"} />
      </Box>
    </Box>
  );
};
export {};
