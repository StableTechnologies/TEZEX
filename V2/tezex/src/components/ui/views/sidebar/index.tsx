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
const pages = ["Home", "Analytics", "About"];

const settings = [""];
export interface ISideBarProps {
  openMenu: boolean;
  toggleMenu: () => void;
}
export const SideBar: FC<ISideBarProps> = (props) => {
  const [collapsed, setCollapsed] = React.useState(true);
  useEffect(() => {
    setCollapsed(!props.openMenu);
  }, [props.openMenu]);

  return (
    <Box
      sx={{
        display: "flex",
        width: "100%",
      }}
    >
      <Sidebar
        backgroundColor="#FFFFFF"
        collapsed={collapsed}
        onBackdropClick={() => setCollapsed(false)}
        rtl={true}
        rootStyles={{
          //boxShadow: "20px 20px 25px 20px rgba(0, 0, 0, 0.1)",
          fontSize: collapsed ? "0px" : "3vw",
          boxShadow: "0px 0px 10px 0px rgba(0,0,0,0.15)",
          borderRight: "0px",

          textAlign: "right",
        }}
      >
        <Menu
          menuItemStyles={{
            button: {
              // the active class will be added automatically by react router
              // so we can use it to style the active menu item
              [`&.active`]: {
                backgroundColor: "#FFFFFF",
              },
            },
          }}
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
                <IconButton onClick={() => props.toggleMenu()}>
                  <KeyboardDoubleArrowRightSharp />
                </IconButton>
              }
            ></MenuItem>
          )}
        </Menu>
        <Menu
          menuItemStyles={{
            button: {
              // the active class will be added automatically by react router
              // so we can use it to style the active menu item
              [`&.active`]: {
                backgroundColor: "#FFFFFF",
              },
            },
          }}
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
                src={logo}
                alt="Logo"
              />
            </MenuItem>
          )}
        </Menu>
        <Menu
          rootStyles={{
            display: !props.openMenu ? "none" : "block",
          }}
        >
          <SubMenu
            label="Home"
            rootStyles={
              {
                //textAlign: "right"
              }
            }
          >
            <MenuItem
              component={<Link to="/home/swap" />}
              rootStyles={{
                textAlign: "right",
                justifyContent: "flex-end",
                paddingRight: "0px",
                position: "relative",
                right: "0px",
                padding: "0px 0px 0px 0px",
              }}
            >
              <Typography> Swap</Typography>
            </MenuItem>
            <SubMenu label="Liquidity">
              <MenuItem component={<Link to="/home/add" />}> Add</MenuItem>
              <MenuItem component={<Link to="/home/remove" />}>
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
