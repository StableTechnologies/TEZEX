import React, { FC } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";

import style from "./style";
import useStyles from "../../hooks/styles";

import { useSession } from "../../hooks/session";
import Box from "@mui/material/Box";

interface NavTabProps {
  label: string;
  href: string;
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
  const { label, ...restProps } = props;
  return (
    <Box sx={{ display: "inline-flex" }}>
      <Tab
        sx={{ cursor: "pointer" }}
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
  const value = location.pathname.startsWith("/analytics") ? 1 : 0;

  const aboutRedirectUrl = useSession().appConfig.aboutRedirectUrl;

  return (
    <Tabs
      value={value}
      sx={styles.navApp}
      aria-label="Primary navigation"
      TabIndicatorProps={{
        style: { display: "none" },
      }}
    >
      <NavTab label="Home" href="/home/swap" />
      <NavTab label="Analytics" href="/analytics" />
      <NavTabExternal label="About" href={aboutRedirectUrl} />
    </Tabs>
  );
};
