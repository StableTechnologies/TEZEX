import React, { FC, useEffect } from "react";

import Box from "@mui/material/Box";
import logo from "../../../../assets/TezexLogo.svg";

import IconButton from "@mui/material/IconButton";
import useStyles from "../../../../hooks/styles";
import style from "./style";
import { Sidebar, Menu, MenuItem, SubMenu } from "react-pro-sidebar";
import { Link } from "react-router-dom";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";

import logoSmall from "../../../../assets/tezexIcon.svg";
import KeyboardDoubleArrowRightSharp from "@mui/icons-material/KeyboardDoubleArrowRightSharp";
import { useSession } from "../../../../hooks/session";
import { TransactingComponent } from "../../../../types/general";

export interface ISideBarProps {
  openMenu: boolean;
  toggleMenu: () => void;
}
export const SideBar: FC<ISideBarProps> = (props) => {
  const [collapsed, setCollapsed] = React.useState(true);
  const [active, setActive] = React.useState(0);

  const sessionInfo = useSession();
  const styles = useStyles(style);
  useEffect(() => {
    setCollapsed(!props.openMenu);
  }, [props.openMenu]);

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
  return (
    <Box sx={styles.box}>
      <Sidebar
        backgroundColor={styles.root.backgroundColor}
        collapsed={collapsed}
        onBackdropClick={() => setCollapsed(false)}
        rtl={true}
        rootStyles={styles.root}
      >
        <Menu>
          {!props.openMenu ? (
            <MenuItem>
              <IconButton onClick={() => props.toggleMenu()}>
                <MenuOutlinedIcon />
              </IconButton>
            </MenuItem>
          ) : (
            <MenuItem
              suffix={
                <IconButton
                  sx={{
                    //                  paddingRight: "10px"
                    right: "60%",
                  }}
                  onClick={() => props.toggleMenu()}
                >
                  <KeyboardDoubleArrowRightSharp />
                </IconButton>
              }
            >
              <Box
                component="img"
                sx={{
                  display: "none",
                  justifyContent: "center",
                  alignItems: "center",
                  width: "100%",

                  "@media (max-width: 900px) and (orientation: landscape)": {
                    display: "flex",
                  },
                }}
                src={logo}
                alt="Logo"
              />
            </MenuItem>
          )}
        </Menu>
        <Menu>
          {!props.openMenu ? (
            <MenuItem>
              <Box
                component="img"
                sx={{
                  display: "flex",
                }}
                src={logoSmall}
                alt="Logo"
              />
            </MenuItem>
          ) : (
            <></>
          )}
        </Menu>
        <Menu
          menuItemStyles={styles.menuItem}
          rootStyles={
            !props.openMenu ? styles.menuRootClosed : styles.menuRootOpen
          }
        >
          <SubMenu
            active={active === 0 || active === 1 || active === 2 ? true : false}
            label="Home"
            rootStyles={styles.home}
          >
            <MenuItem
              active={active === 0 ? true : false}
              component={<Link to="/home/swap" />}
              rootStyles={styles.swap}
            >
              Swap
            </MenuItem>
            <SubMenu
              active={active === 1 || active === 2 ? true : false}
              label="Liquidity"
              rootStyles={styles.liquidity}
            >
              <MenuItem
                active={active === 1 ? true : false}
                component={<Link to="/home/add" />}
                rootStyles={styles.add}
              >
                {" "}
                Add
              </MenuItem>
              <MenuItem
                active={active === 2 ? true : false}
                component={<Link to="/home/remove" />}
                rootStyles={styles.remove}
              >
                {" "}
                Remove
              </MenuItem>
            </SubMenu>
          </SubMenu>
          <MenuItem active={false} component={<Link to="/Analytics" />}>
            {" "}
            Analytics
          </MenuItem>
          <MenuItem component={<Link to="/About" />}> About</MenuItem>
        </Menu>
      </Sidebar>
    </Box>
  );
};
