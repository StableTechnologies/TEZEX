import React, { FC, useCallback, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Collapse,
  SwipeableDrawer,
  Box,
  Typography,
} from "@mui/material";
import KeyboardDoubleArrowRightSharp from "@mui/icons-material/KeyboardDoubleArrowRightSharp";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { useSession } from "../../../../hooks/session";
import { TransactingComponent } from "../../../../types/general";
import style from "./style";
import useStyles from "../../../../hooks/styles";
import { useMobileOrientation } from "react-device-detect";
import logo from "../../../../assets/TezexLogo.svg";
import { Wallet as WalletControl } from "../../../wallet";
import { homePathForHost } from "../../../../routing";
import { useWallet } from "../../../../hooks/wallet";
import { connectWalletToCustomNetwork } from "../../../../functions/beacon";
import { resolveSnet } from "../../../../pages/Stez/network";
import {
  DEFAULT_LIQUIDITY_PATH,
  DEFAULT_REMOVE_LIQUIDITY_PATH,
} from "../../../../tradeRouting";

export interface ISideBarProps {
  openMenu: boolean;
  toggleMenu: () => void;
}

export const SideBar: FC<ISideBarProps> = (props) => {
  const [homeOpen, setHomeOpen] = React.useState(false);
  const [liquidityOpen, setLiquidityOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const sessionInfo = useSession();
  const location = useLocation();
  const styles = useStyles(style);
  const { isLandscape } = useMobileOrientation();
  const homePath = homePathForHost(window.location.hostname);
  const wallet = useWallet();
  const isStezRoute =
    location.pathname.startsWith("/stez") ||
    window.location.hostname.startsWith("stez.");
  const connectToSnet = useCallback(async () => {
    const snet = await resolveSnet();
    await connectWalletToCustomNetwork(wallet, {
      name: snet.name,
      rpcUrl: snet.rpcUrl,
      chainId: snet.chainId,
    });
  }, [wallet]);

  useEffect(() => {
    switch (sessionInfo.activeComponent) {
      case TransactingComponent.SWAP:
        setActive(0);
        break;
      case TransactingComponent.ADD_LIQUIDITY:
        setActive(1);
        break;
      case TransactingComponent.REMOVE_LIQUIDITY:
        setActive(2);
        break;
    }
  }, [sessionInfo]);

  const aboutRedirectUrl = sessionInfo.appConfig.aboutRedirectUrl;
  const iOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <SwipeableDrawer
      disableBackdropTransition={false}
      disableDiscovery={iOS}
      onClose={props.toggleMenu}
      onOpen={props.toggleMenu}
      open={props.openMenu}
      variant={isLandscape ? "permanent" : undefined}
      anchor="right"
      sx={styles.drawer}
      ModalProps={{ keepMounted: true }}
      transitionDuration={{
        enter: 280,
        exit: 240,
      }}
      SlideProps={{
        easing: {
          enter: "cubic-bezier(0.22, 1, 0.36, 1)",
          exit: "cubic-bezier(0.4, 0, 0.2, 1)",
        },
      }}
    >
      <List>
        <ListItem sx={styles.menuItemOpened}>
          <IconButton
            onClick={props.toggleMenu}
            sx={styles.menuButton}
            aria-label="Close navigation"
          >
            <KeyboardDoubleArrowRightSharp />
            <Box component="img" sx={styles.logo} src={logo} alt="Logo" />
          </IconButton>
        </ListItem>

        <ListItem disablePadding sx={styles.utilityItem}>
          <Box sx={styles.utilityPanel}>
            <Typography sx={styles.utilityLabel}>WALLET</Typography>
            <Box sx={styles.walletControl}>
              <WalletControl
                variant="header"
                visualVariant="dark"
                accountPresentation="drawer"
                connectOverride={isStezRoute ? connectToSnet : undefined}
              />
            </Box>
          </Box>
        </ListItem>

        <ListItem disablePadding sx={styles.homeItem}>
          <ListItemButton onClick={() => setHomeOpen(!homeOpen)}>
            <ListItemIcon>
              {homeOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItemIcon>
            <ListItemText primary="Home" sx={styles.listItemText} />
          </ListItemButton>
        </ListItem>

        <Collapse in={homeOpen} timeout="auto" unmountOnExit>
          <List>
            <ListItem disablePadding sx={styles.listItem}>
              <ListItemButton
                component={Link}
                to={homePath}
                onClick={props.toggleMenu}
                selected={active === 0}
                sx={styles.swapButton}
              >
                <ListItemText primary="Swap" sx={styles.swapText} />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding sx={styles.listItem}>
              <ListItemButton
                onClick={() => setLiquidityOpen(!liquidityOpen)}
                sx={styles.liquidityButton}
              >
                <ListItemIcon>
                  {liquidityOpen ? <ExpandLess /> : <ExpandMore />}
                </ListItemIcon>
                <ListItemText primary="Liquidity" sx={styles.liquidityText} />
              </ListItemButton>
            </ListItem>

            <Collapse in={liquidityOpen} timeout="auto" unmountOnExit>
              <List>
                <ListItem disablePadding sx={styles.listItem}>
                  <ListItemButton
                    component={Link}
                    to={DEFAULT_LIQUIDITY_PATH}
                    onClick={props.toggleMenu}
                    selected={active === 1}
                    sx={styles.nestedButton}
                  >
                    <ListItemText primary="Add" sx={styles.nestedText} />
                  </ListItemButton>
                </ListItem>

                <ListItem disablePadding sx={styles.listItem}>
                  <ListItemButton
                    component={Link}
                    to={DEFAULT_REMOVE_LIQUIDITY_PATH}
                    onClick={props.toggleMenu}
                    selected={active === 2}
                    sx={styles.nestedButton}
                  >
                    <ListItemText primary="Remove" sx={styles.nestedText} />
                  </ListItemButton>
                </ListItem>
              </List>
            </Collapse>
          </List>
        </Collapse>

        <ListItem disablePadding sx={styles.listItem}>
          <ListItemButton
            component={Link}
            to="/analytics"
            onClick={props.toggleMenu}
            selected={location.pathname.startsWith("/analytics")}
          >
            <ListItemText primary="Analytics" sx={styles.listItemText} />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding sx={styles.listItem}>
          <ListItemButton
            component={Link}
            to="/stez"
            onClick={props.toggleMenu}
            selected={location.pathname.startsWith("/stez")}
          >
            <ListItemText primary="sTEZ" sx={styles.listItemText} />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding sx={styles.listItem}>
          <ListItemButton href={aboutRedirectUrl}>
            <ListItemText primary="About" sx={styles.listItemText} />
          </ListItemButton>
        </ListItem>
      </List>
    </SwipeableDrawer>
  );
};
