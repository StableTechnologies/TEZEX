import React, { FC, useState, useEffect } from "react";
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
export interface INavLiquidty {
  scale?: number;
}
export const NavLiquidity: FC<INavLiquidty> = (props) => {
  const styles = useStyles(style, props.scale || 1);
  const [value, setValue] = useState(0);

  const sessionInfo = useSession();
  useEffect(() => {
    switch (sessionInfo.activeComponent) {
      case TransactingComponent.SWAP:
        setValue(0);
        break;
      case TransactingComponent.ADD_LIQUIDITY:
        setValue(0);
        break;
      case TransactingComponent.REMOVE_LIQUIDITY:
        setValue(1);
        break;
    }
  }, [sessionInfo]);
  /*
  useEffect(() => {
    if (loading) {
      navigate("home/swap");
      setValue(0);
      setLoading(false);
    }
  }, [loading, navigate]);
  */

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    event.preventDefault();
    setValue(newValue);
  };
  return (
    <Tabs
      value={value}
      sx={styles.navLiquidity}
      onChange={handleChange}
      aria-label=" "
      TabIndicatorProps={{
        children: (
          <span
            className={
              value === 0
                ? "MuiTabs-indicatorSpan-add"
                : "MuiTabs-indicatorSpan-remove"
            }
          />
        ),
      }}
    >
      <NavTab label="Add Liquidity" href="/home/add" />
      <NavTab label="Remove Liquidity" href="/home/remove" />
    </Tabs>
  );
};
