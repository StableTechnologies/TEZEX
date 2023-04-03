import React, { FC, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";

import style from "./style";
import useStyles from "../../hooks/styles";

export interface INav {
  children: string;
}

interface NavTabProps {
  label: string;
  href: string;
}

function NavTab(props: NavTabProps) {
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
export const NavApp: FC = () => {
  const styles = useStyles(style);
  const [value, setValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) {
      navigate("home/swap");
      setValue(0);
      setLoading(false);
    }
  }, [loading, navigate]);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    event.preventDefault();
    setValue(newValue);
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
      <NavTab label="About" href="/About" />
    </Tabs>
  );
};
