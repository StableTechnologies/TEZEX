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
import { Sidebar, Menu, MenuItem } from "react-pro-sidebar";
import { Link } from "react-router-dom";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import CloseIcon from "@mui/icons-material/Close";
import { useTheme } from "@mui/material";
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
    <Sidebar
      backgroundColor="#FFFFFF"
      collapsed={collapsed}
      onBackdropClick={() => setCollapsed(false)}
      rootStyles={{
        //boxShadow: "20px 20px 25px 20px rgba(0, 0, 0, 0.1)",
        fontSize: collapsed ? "0px" : "13px",
        boxShadow: "0px 0px 10px 0px rgba(0,0,0,0.15)",
        borderRight: "0px",
      }}
    >
      <Box
        sx={{
          display: "flex",
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
        >
          <MenuItem
            icon={
              !props.openMenu ? (
                <MenuOutlinedIcon onClick={() => props.toggleMenu()} />
              ) : (
                <CloseIcon onClick={() => props.toggleMenu()} />
              )
            }
          >
            {" "}
          </MenuItem>
          <MenuItem component={<Link to="/home/swap" />}> Home</MenuItem>
          <MenuItem component={<Link to="/Analytics" />}> Analytics</MenuItem>
          <MenuItem component={<Link to="/About" />}> About</MenuItem>
        </Menu>
      </Box>
    </Sidebar>
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
