import React, { FC, useState, useEffect } from "react";

import { useNavigate } from "react-router-dom";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { useSession } from "../../hooks/session";

import { TransactingComponent } from "../../types/general";
const tabClasses = {
  "&.MuiButtonBase-root": {
    fontSize: "1.11vw",
    minHeight: "1.32vw",
    minWidth: "3.0vw",
    padding: "3% 3.9vw",
    zIndex: 2,

    color: "palette.text.primary",
    textTransform: "initial",
  },
  wrapper: {
    color: "palette.text.primary",
    textTransform: "initial",
  },
};

const classes = {
  ".MuiTabs-flexContainer": {
    justifyContent: "space-between",

    border: "1px solid #EDEDED",
    borderRadius: 4,
    display: "inline-flex",
    position: "relative",
  },
  ".MuiTabs-indicator": {
    top: 0,

    minHeight: "5vw",

    background: "none",
    "&:after": {
      content: '""',
      display: "block",
      position: "absolute",

      top: ".5vw",
      bottom: "1.5vw",
      left: "1vw",
      right: "1vw",
      borderRadius: 3,
      backgroundColor: "selectedHomeTab.main",
    },
  },
};

interface NavTabProps {
  label: string;
  href: string;
}

function NavTab(props: NavTabProps) {
  const navigate = useNavigate();
  return (
    <Tab
      sx={tabClasses}
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
      sx={classes}
      onChange={handleChange}
      aria-label="nav tabs example"
    >
      <NavTab label="Swap" href="/home/swap" />
      <NavTab label="Add Liquidity" href="/home/add" />
      <NavTab label="Remove Liquidity" href="/home/remove" />
    </Tabs>
  );
};
