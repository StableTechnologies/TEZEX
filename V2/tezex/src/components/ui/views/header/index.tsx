import React, { FC } from "react";
import { Wallet } from "../../../wallet/Wallet";
import { NavApp } from "../../../nav";

import Grid2 from "@mui/material/Unstable_Grid2"; // Grid version 2
import Box from "@mui/material/Box";
import logo from "../../../../assets/TezexLogo.svg";
import logoSmall from "../../../../assets/tezexIcon.svg";

import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import Container from "@mui/material/Container";
import style from "./style";
import useStyles from "../../../../hooks/styles";

export const Header: FC = (props) => {
  const scalingKey = "header";
  const styles = useStyles(style, scalingKey);

  return (
    <AppBar
      sx={styles.isMobile ? styles.appBar.mobile : styles.appBar}
      color="transparent"
      position="static"
    >
      <Container maxWidth={false}>
        <Toolbar
          disableGutters
          sx={styles.isMobile ? styles.toolbar.mobile : styles.toolbar}
        >
          <Grid2 container sx={styles.container}>
            <Grid2 sm={3}>
              <Box
                component="img"
                sx={styles.logoLarge}
                src={logo}
                alt="Logo"
              />

              <Box
                component="img"
                sx={styles.logoSmall}
                src={logoSmall}
                alt="Logo"
              />
            </Grid2>

            <Grid2 sx={styles.nav}>
              <NavApp scalingKey={scalingKey} />
            </Grid2>
            <Grid2 md={2} sx={styles.wallet}>
              <Wallet variant={"header"} scalingKey={scalingKey} />
            </Grid2>
          </Grid2>
        </Toolbar>
      </Container>
    </AppBar>
  );
};
