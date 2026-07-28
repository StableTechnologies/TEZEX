import React, { FC, useEffect } from "react";
import { Link } from "react-router-dom";
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
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import logo from "../../../../assets/TezexLogo.svg";
import logoSmall from "../../../../assets/tezexIcon.svg";
import { Wallet as WalletControl } from "../../../wallet";

export interface ISideBarProps {
  openMenu: boolean;
  toggleMenu: () => void;
}

export const SideBar: FC<ISideBarProps> = (props) => {
  const [homeOpen, setHomeOpen] = React.useState(false);
  const [liquidityOpen, setLiquidityOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const sessionInfo = useSession();
  const styles = useStyles(style);
  const { isLandscape } = useMobileOrientation();

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
      disableBackdropTransition={!iOS}
      disableDiscovery={iOS}
      onClose={props.toggleMenu}
      onOpen={props.toggleMenu}
      open={props.openMenu}
      variant={isLandscape ? "permanent" : undefined}
      anchor="right"
      sx={props.openMenu ? styles.drawer : styles.drawerClosed}
      transitionDuration={{
        enter: 500,
        exit: 0,
      }}
    >
      <List>
        <ListItem
          sx={props.openMenu ? styles.menuItemOpened : styles.menuItemClosed}
        >
          <IconButton
            onClick={props.toggleMenu}
            sx={styles.menuButton}
            aria-label="Close navigation"
          >
            {!props.openMenu ? (
              <MenuOutlinedIcon />
            ) : (
              <>
                <KeyboardDoubleArrowRightSharp />
                <Box component="img" sx={styles.logo} src={logo} alt="Logo" />
              </>
            )}
          </IconButton>
        </ListItem>

        {!props.openMenu && (
          <ListItem>
            <Box component="img" src={logoSmall} alt="Logo" />
          </ListItem>
        )}

        {props.openMenu && (
          <>
            <ListItem disablePadding sx={styles.utilityItem}>
              <Box sx={styles.utilityPanel}>
                <Typography sx={styles.utilityLabel}>WALLET</Typography>
                <Box sx={styles.walletControl}>
                  <WalletControl variant="header" visualVariant="dark" />
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
                    to="/home/swap"
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
                    <ListItemText
                      primary="Liquidity"
                      sx={styles.liquidityText}
                    />
                  </ListItemButton>
                </ListItem>

                <Collapse in={liquidityOpen} timeout="auto" unmountOnExit>
                  <List>
                    <ListItem disablePadding sx={styles.listItem}>
                      <ListItemButton
                        component={Link}
                        to="/home/add"
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
                        to="/home/remove"
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
              <ListItemButton disabled component={Link} to="/Analytics">
                <ListItemText primary="Analytics" sx={styles.listItemText} />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding sx={styles.listItem}>
              <ListItemButton href={aboutRedirectUrl}>
                <ListItemText primary="About" sx={styles.listItemText} />
              </ListItemButton>
            </ListItem>
          </>
        )}
      </List>
    </SwipeableDrawer>
  );
};
