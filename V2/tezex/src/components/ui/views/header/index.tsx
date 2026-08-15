import React, { FC, useCallback } from "react";
import { Wallet } from "../../../wallet/Wallet";
import { NavApp } from "../../../nav";

import Box from "@mui/material/Box";
import logo from "../../../../assets/TezexLogo.svg";

import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import Container from "@mui/material/Container";
import { Link, useLocation } from "react-router-dom";
import style from "./style";
import useStyles from "../../../../hooks/styles";
import { NetworkSelector } from "../../elements/selectors/networkSelector/NetworkSelector";
import { useColorMode } from "../../../../contexts/color-mode";
import { homePathForHost } from "../../../../routing";
import { useWallet } from "../../../../hooks/wallet";
import { connectWalletToCustomNetwork } from "../../../../functions/beacon";
import { resolveSnet } from "../../../../pages/Stez/network";

export interface IHeader {
  openMenu: boolean;
  toggleMenu: () => void;
}
export const Header: FC<IHeader> = (props) => {
  const scalingKey = "header";
  const styles = useStyles(style, scalingKey);
  const { mode, toggleMode } = useColorMode();
  const isLight = mode === "light";
  const homePath = homePathForHost(window.location.hostname);
  const location = useLocation();
  const wallet = useWallet();
  const isStezRoute = location.pathname.startsWith("/stez");
  const connectToSnet = useCallback(async () => {
    const snet = await resolveSnet();
    await connectWalletToCustomNetwork(wallet, {
      name: snet.name,
      rpcUrl: snet.rpcUrl,
      chainId: snet.chainId,
    });
  }, [wallet]);

  return (
    <AppBar
      sx={styles.isMobile ? styles.appBar.mobile : styles.appBar}
      color="transparent"
      position="static"
    >
      <Container maxWidth={false} sx={styles.shell}>
        <Toolbar
          disableGutters
          sx={styles.isMobile ? styles.toolbar.mobile : styles.toolbar}
        >
          <Box sx={styles.container}>
            <Box
              component={Link}
              to={homePath}
              aria-label="TEZEX home"
              onMouseDown={(event) => event.preventDefault()}
              sx={styles.logoLink}
            >
              <Box component="img" sx={styles.logoLarge} src={logo} alt="" />
            </Box>

            <Box sx={styles.networkSelector}>
              <NetworkSelector />
            </Box>

            <Box sx={styles.nav}>
              <NavApp scalingKey={scalingKey} />
            </Box>
            <Box sx={styles.actions}>
              <Box
                component="button"
                type="button"
                role="switch"
                aria-checked={isLight}
                aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
                title={`Switch to ${isLight ? "dark" : "light"} mode`}
                onClick={toggleMode}
                sx={styles.themeToggle}
              >
                <LightModeOutlinedIcon sx={styles.themeIcon} />
                <DarkModeOutlinedIcon sx={styles.themeIcon} />
                <Box
                  component="span"
                  sx={{
                    ...styles.themeToggleKnob,
                    transform: isLight ? "translateX(0)" : "translateX(24px)",
                  }}
                />
              </Box>
              <Box sx={styles.wallet}>
                <Wallet
                  variant={"header"}
                  scalingKey={scalingKey}
                  visualVariant="dark"
                  connectOverride={isStezRoute ? connectToSnet : undefined}
                />
              </Box>
            </Box>
            <Box sx={props.openMenu ? styles.hide : styles.menu}>
              <IconButton
                onClick={props.toggleMenu}
                aria-label="Open navigation"
                sx={styles.menuButton}
              >
                <MenuIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};
