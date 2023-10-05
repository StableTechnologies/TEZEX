import React, { FC, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";

import style from "./style";
import useStyles from "../../hooks/styles";

import { useSession } from "../../hooks/session";

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

function NavTab(props: NavTabProps, external?: boolean) {
  const navigate = useNavigate();
  return (
    <Tab
      sx={{}}
      onClick={(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
        event.preventDefault();
        navigate(props.href);
      }}
      {...props}
    />
  );
}

interface INavApp {
  scalingKey?: string;
}

export const NavApp: FC<INavApp> = (props) => {
  const styles = useStyles(style, props.scalingKey);
  const [value, setValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const pageId = {
    home: 0,
    analytics: 1,
    about: 2,
  };

  const aboutRedirectUrl = useSession().appConfig.aboutRedirectUrl;

  useEffect(() => {
    if (loading) {
      navigate("home/swap");
      setValue(0);
      setLoading(false);
    }
  }, [loading, navigate]);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    event.preventDefault();
    if (newValue !== pageId.about) setValue(newValue);
  };

  return (
    <Tabs
      value={value}
      sx={styles.navApp}
      onChange={handleChange}
      aria-label="nav tabs "
      TabIndicatorProps={{
        style: { display: "none" },
      }}
    >
      <NavTab label="Home" href="/home/swap" />
      <NavTab label="Analytics" href="/Analytics" />
      <NavTabExternal label="About" href={aboutRedirectUrl} />
    </Tabs>
  );
};
