import React, { FC, useEffect } from "react";
import { Wallet } from "../../../wallet/Wallet";
import { NavApp } from "../../../nav";

import Grid2 from "@mui/material/Unstable_Grid2"; // Grid version 2
import Box from "@mui/material/Box";
import logo from "../../../../assets/TezexLogo.svg";

import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import MenuIcon from "@mui/icons-material/Menu";
import Container from "@mui/material/Container";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import useStyles from "../../../../hooks/styles";
import style from "./style";
import { Sidebar, Menu, MenuItem, SubMenu } from "react-pro-sidebar";
import { Link } from "react-router-dom";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import CloseIcon from "@mui/icons-material/Close";
import { useTheme } from "@mui/material";
import { padding } from "@mui/system";
import KeyboardDoubleArrowRightSharpIcon from "@mui/icons-material/KeyboardDoubleArrowRightSharp";

import logoSmall from "../../../../assets/tezexIcon.svg";
import KeyboardDoubleArrowRightSharp from "@mui/icons-material/KeyboardDoubleArrowRightSharp";
import zIndex from "@mui/material/styles/zIndex";
const pages = ["Home", "Analytics", "About"];

const settings = [""];
export interface ISideBarProps {
  openMenu: boolean;
  toggleMenu: () => void;
}
export const SideBar: FC<ISideBarProps> = (props) => {
  const [collapsed, setCollapsed] = React.useState(true);

  const styles = useStyles(style);
  useEffect(() => {
    setCollapsed(!props.openMenu);
  }, [props.openMenu]);

  return (
    <Box sx={styles.box}>
      <Sidebar
        backgroundColor={styles.root.backgroundColor}
        collapsed={collapsed}
        onBackdropClick={() => setCollapsed(false)}
        rtl={true}
        rootStyles={styles.root}
      >
        <Menu
          menuItemStyles={
            {
              //            button: ({ level, active, disabled }) => {
              //              const style = active ? styles.menuItemActive : styles.menuItem;
              //              //return style
              //              if (active) {
              //                return {
              //                  backgroundColor: "#FFFFFF",
              //                }
              //              }
              //
              //              return {
              //                backgroundColor: "red"
              //              }
              //            },
            }
          }
          rootStyles={
            {
              //  textAlign: "right"
            }
          }
        >
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
                  /* width: "164px",
                 "@media screen and (max-width: 768px)": {
                   width: "164px",
                 },
                 "@media screen and (max-width: 246px)": {
                   display: "none",
                 },*/

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
        <Menu
          menuItemStyles={{}}
          rootStyles={
            {
              //  textAlign: "right"
            }
          }
        >
          {!props.openMenu ? (
            <MenuItem>
              <Box
                component="img"
                sx={{
                  display: "flex",
                  /* width: "164px",
                 "@media screen and (max-width: 768px)": {
                   width: "164px",
                 },
                 "@media screen and (max-width: 246px)": {
                   display: "none",
                 },*/
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
          menuItemStyles={{
            button: ({ level, active, disabled }) => {
              const style = active ? styles.menuItemActive : styles.menuItem;
              if (level > 1) {
                const style1 = active
                  ? styles.menuItemActive1
                  : styles.menuItem1;
                return style1;
              }
              return style;
              //if (active) {
              //  return {
              //    backgroundColor: "#FFFFFF",
              //  }
              //}
            },
          }}
          rootStyles={{
            display: !props.openMenu ? "none" : "block",
            paddingTop: "10%",

            //fontSize: "2.5vw",//collapsed ? "0px" : "3vw",
          }}
        >
          <SubMenu label="Home" rootStyles={styles.home}>
            <MenuItem
              component={<Link to="/home/swap" />}
              rootStyles={styles.swap}
            >
              Swap
            </MenuItem>
            <SubMenu label="Liquidity" rootStyles={styles.liquidity}>
              <MenuItem
                component={<Link to="/home/add" />}
                rootStyles={styles.add}
              >
                {" "}
                Add
              </MenuItem>
              <MenuItem
                component={<Link to="/home/remove" />}
                rootStyles={styles.remove}
              >
                {" "}
                Remove
              </MenuItem>
            </SubMenu>
          </SubMenu>
          <MenuItem component={<Link to="/Analytics" />}> Analytics</MenuItem>
          <MenuItem component={<Link to="/About" />}> About</MenuItem>
        </Menu>
      </Sidebar>
    </Box>
  );
};
/* 
 *
 * ik
          <Box sx={{ flexGrow: 1, display: { xs: "flex", md: "none" } }}>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "left",
              }}
              keepMounted
              transformOrigin={{
                vertical: "top",
                horizontal: "left",
              }}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              sx={{
                display: { xs: "block", md: "none" },
              }}
            >
              {pages.map((page) => (
                <MenuItem key={page} onClick={handleCloseNavMenu}>
                  <Typography textAlign="center">{page}</Typography>
                </MenuItem>
              ))}
            </Menu>
          </Box>
          <Typography
            variant="h5"
            noWrap
            component="a"
            href="/"
            sx={{
              mr: 2,
              display: { xs: "flex", md: "none" },
              flexGrow: 1,
              fontFamily: "monospace",
              fontWeight: 700,
              letterSpacing: ".3rem",
              color: "inherit",
              textDecoration: "none",
            }}
          >
            Tezex small
          </Typography>
          <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" } }}>

            {pages.map((page) => (
              <Button
                key={page}
                onClick={handleCloseNavMenu}
                sx={{ my: 2, color: "black", display: "block" }}
              >
                {page}
              </Button>
            ))}
          </Box>
 * */
