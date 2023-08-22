import React, { FC } from "react";
import { Wallet } from "../../wallet/Wallet";
import { NavApp } from "../../nav";

import Grid2 from "@mui/material/Unstable_Grid2"; // Grid version 2
import Box from "@mui/material/Box";
import logo from "../../../assets/TezexLogo.svg";

import style from "./style";
import useStyles from "../../../hooks/styles";

export const Header: FC = () => {
  const styles = useStyles(style);
  return (
    <Grid2 sx={styles.header.headerBox}>
      <Grid2 style={styles.header.logo}>
        <img src={logo} alt="Logo" />
      </Grid2>

      <Grid2 sx={styles.header.nav}>
        <NavApp />
      </Grid2>
      <Grid2 sx={styles.header.wallet}>
        <Wallet variant={"header"} />
      </Grid2>
    </Grid2>
  );
};
export {};
