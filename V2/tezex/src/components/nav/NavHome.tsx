import React, { FC, useState, useEffect } from "react";

import { useNavigate } from "react-router-dom";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { useSession } from "../../hooks/session";

import { TransactingComponent } from "../../types/general";

import style from "./style";

interface NavTabProps {
  label: string;
  href: string;
}

function NavTab(props: NavTabProps) {
  const navigate = useNavigate();
  return (
    <Tab
      sx={style.navHome.tab}
      onClick={(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
        event.preventDefault();
        navigate(props.href);
      }}
      {...props}
    />
  );
}

export interface INavHome {
  children: string;
}
export const NavHome: FC = () => {
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
        setValue(2);
        break;
    }
  }, [sessionInfo]);

  return (
    <Tabs
      value={value}
      sx={style.navHome.root}
      onChange={handleChange}
      aria-label="nav tabs example"
    >
      <NavTab label="Swap" href="/home/swap" />
      <NavTab label="Add Liquidity" href="/home/add" />
      <NavTab label="Remove Liquidity" href="/home/remove" />
    </Tabs>
  );
};
