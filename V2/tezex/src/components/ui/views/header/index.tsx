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
import Typography from "@mui/material/Typography";
import Menu from "@mui/material/Menu";
import MenuIcon from "@mui/icons-material/Menu";
import Container from "@mui/material/Container";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import MenuItem from "@mui/material/MenuItem";
import style from "./style";
import useStyles from "../../../../hooks/styles";
import { Module } from "module";

const pages = ["Home", "Analytics", "About"];

const settings = [""];
export interface IHeader {
  openMenu: boolean;
  toggleMenu: () => void;
}
export const Header: FC<IHeader> = (props) => {
  const styles = useStyles(style);

  const [anchorElNav, setAnchorElNav] = React.useState<null | HTMLElement>(
    null
  );
  const [anchorElUser, setAnchorElUser] = React.useState<null | HTMLElement>(
    null
  );

  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget);
  };
  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  /* return (
    <Grid2 sx={styles.header.headerbox}>
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
  ); */

  return (
    //<AppBar sx={styles.header.headerbox} position="static">
    <AppBar
      sx={{
        "&.MuiPaper-root": {
          "@media screen and (max-width: 768px)": {
            boxShadow: "none",
          },
        },
      }}
      color="transparent"
      position="static"
    >
      <Container
        sx={
          {
            //marginBottom: "10px",
            //display: "flex",
            /* justifyContent: "center",
               alignContent: "center",
               alignItems: "center",
               height: "5vh",
             */
          }
        }
        maxWidth="xl"
      >
        <Toolbar
          disableGutters
          sx={{
            height: "100%",
            transition: "height 0.3s ",
            "@media screen and (max-width: 768px)": {
              height: "10vh",
            },
          }}
        >
          <Grid2
            container
            //direction="row"
            alignItems="center"
            justifyContent="flex-start"
            alignContent="center"
            sx={{ flexGrow: 1 }}
          >
            <Grid2
              sm={3}
              style={{
                width: "164px",
              }}
            >
              <Box
                component="img"
                sx={{
                  display: "flex",
                  Width: "164px",
                  "@media screen and (max-width: 768px)": {
                    width: "164px",
                  },
                  "@media screen and (max-width: 246px)": {
                    display: "none",
                  },
                }}
                src={logo}
                alt="Logo"
              />

              <Box
                component="img"
                sx={{
                  display: "none",
                  //Width: "",
                  "@media screen and (max-width: 246px)": {
                    display: "flex",
                  },
                }}
                src={logoSmall}
                alt="Logo"
              />
            </Grid2>

            <Grid2 sx={styles.nav}>
              <NavApp />
            </Grid2>
            <Grid2 md={2} sx={styles.wallet}>
              <Wallet variant={"header"} />
            </Grid2>
            <Grid2 md={1} sx={props.openMenu ? styles.hide : styles.menu}>
              <IconButton onClick={props.toggleMenu}>
                <MenuIcon />
              </IconButton>
            </Grid2>
          </Grid2>
        </Toolbar>
      </Container>
    </AppBar>
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
export {};
