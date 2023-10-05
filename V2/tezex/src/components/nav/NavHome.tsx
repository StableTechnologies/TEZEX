import React, { FC, useState, useEffect, useCallback } from "react";

import { useNavigate } from "react-router-dom";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { useSession } from "../../hooks/session";

import { TransactingComponent } from "../../types/general";

import style from "./style";
import useStyles from "../../hooks/styles";

interface NavTabProps {
  label: string;
  href: string;
  scalingKey?: string;
}

function NavTab(props: NavTabProps) {
  const navigate = useNavigate();

  const _props = {
    label: props.label,
    href: props.href,
  };
  const styles = useStyles(style, props.scalingKey);
  return (
    <Tab
      sx={styles.navHome.tab}
      onClick={(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
        event.preventDefault();
        navigate(props.href);
      }}
      {..._props}
    />
  );
}

export interface INavHome {
  scalingKey?: string;
}
export const NavHome: FC<INavHome> = (props) => {
  const styles = useStyles(style, props.scalingKey);
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
      <NavTab label="Swap" href="/home/swap" scalingKey={props.scalingKey} />
      <NavTab
        label="Liquidity"
        href={liquidityHref()}
        scalingKey={props.scalingKey}
      />
    </Tabs>
  );
};
