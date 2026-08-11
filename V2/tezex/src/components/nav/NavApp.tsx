import React, { FC } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";

import style from "./style";
import useStyles from "../../hooks/styles";

import { useSession } from "../../hooks/session";
import Box from "@mui/material/Box";
import { homePathForHost } from "../../routing";

interface NavTabProps {
  label: string;
  href: string;
  active?: boolean;
}

function NavTabExternal(props: NavTabProps) {
  return (
    <Tab
      sx={{}}
      onClick={(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
        event.preventDefault();
        window.open(props.href, "_blank");
      }}
      {...props}
    />
  );
}

function NavTab(props: NavTabProps) {
  const navigate = useNavigate();
  const { label, active, ...restProps } = props;
  return (
    <Box sx={{ display: "inline-flex" }}>
      <Tab
        sx={{ cursor: "pointer" }}
        aria-current={active ? "page" : undefined}
        onClick={(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
          event.preventDefault();
          navigate(props.href);
        }}
        label={label}
        {...restProps}
      />
    </Box>
  );
}

interface INavApp {
  scalingKey?: string;
}

export const NavApp: FC<INavApp> = (props) => {
  const styles = useStyles(style, props.scalingKey);
  const location = useLocation();
  const isHomeRoute =
    location.pathname === "/" ||
    location.pathname.startsWith("/home") ||
    location.pathname.startsWith("/swap") ||
    location.pathname.startsWith("/liquidity");
  const value = location.pathname.startsWith("/analytics")
    ? 1
    : location.pathname.startsWith("/stez")
    ? 2
    : isHomeRoute
    ? 0
    : false;

  const aboutRedirectUrl = useSession().appConfig.aboutRedirectUrl;
  const homePath = homePathForHost(window.location.hostname);

  return (
    <Tabs
      value={value}
      sx={styles.navApp}
      aria-label="Primary navigation"
      TabIndicatorProps={{
        style: { display: "none" },
      }}
    >
      <NavTab label="Home" href={homePath} active={value === 0} />
      <NavTab label="Analytics" href="/analytics" active={value === 1} />
      <NavTab label="sTEZ" href="/stez" active={value === 2} />
      <NavTabExternal label="About" href={aboutRedirectUrl} />
    </Tabs>
  );
};
