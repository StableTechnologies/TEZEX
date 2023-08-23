import React, { FC, useState, useEffect, useCallback } from "react";

import { useNavigate } from "react-router-dom";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { useSession } from "../../hooks/session";

import { TransactingComponent } from "../../types/general";

import style from "./style";
import useStyles from "../../hooks/styles";

import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import MenuIcon from "@mui/icons-material/Menu";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

const drawerWidth = 250;
const navItems = ["Home", "About", "Analytics"];
const DrawAppBar: FC = () => {
  const [Open, setMobileOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen((prevState) => !prevState);
  };

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: "center" }}>
      <Typography variant="h6" sx={{ my: 2 }}>
        MUI
      </Typography>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem key={item} disablePadding>
            <ListItemButton sx={{ textAlign: "center" }}>
              <ListItemText primary={item} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar component="nav">
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, display: { xs: "none", sm: "block" } }}
          >
            MUI
          </Typography>
          <Box sx={{ display: { xs: "none", sm: "block" } }}>
            {navItems.map((item) => (
              <Button key={item} sx={{ color: "#fff" }}>
                {item}
              </Button>
            ))}
          </Box>
        </Toolbar>
      </AppBar>
      <Box component="nav">
        <Drawer
          //container={container}
          variant="temporary"
          open={Open}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
      <Box component="main" sx={{ p: 3 }}>
        <Toolbar />
      </Box>
    </Box>
  );
};
interface MenuItemProps {
  label: string;
  href: string;
}

function MenuItem(props: MenuItemProps) {
  const navigate = useNavigate();

  const styles = useStyles(style);
  return (
    <Tab
      sx={styles.navHome.tab}
      onClick={(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
        event.preventDefault();
        navigate(props.href);
      }}
      {...props}
    />
  );
}

export const Menu: FC = () => {
  const styles = useStyles(style);
  const [value, setValue] = useState(0);
  const sessionInfo = useSession();
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    event.preventDefault();
    setValue(newValue);
  };
  useEffect(() => {
    switch (sessionInfo.activeComponent) {
      case TransactingComponent.SWAP:
        setValue(0);
        break;
      case TransactingComponent.ADD_LIQUIDITY:
        setValue(1);
        break;
      case TransactingComponent.REMOVE_LIQUIDITY:
        setValue(1);
        break;
    }
  }, [sessionInfo]);

  const liquidityHref: () => string = useCallback(() => {
    if (sessionInfo.activeComponent === TransactingComponent.REMOVE_LIQUIDITY) {
      return "/home/remove";
    } else return "/home/add";
  }, [sessionInfo]);

  return (
    <Tabs
      value={value}
      sx={styles.navHome.root}
      onChange={handleChange}
      aria-label="nav-home-tabs"
    >
      <MenuItem label="Swap" href="/home/swap" />
      <MenuItem label="Liquidity" href={liquidityHref()} />
    </Tabs>
  );
};
