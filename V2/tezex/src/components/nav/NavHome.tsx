import React, { FC, useState, useEffect, useCallback } from "react";

import { useLocation, useNavigate } from "react-router-dom";
import Tabs from "@mui/material/Tabs";
import Tab, { TabProps } from "@mui/material/Tab";
import { useSession } from "../../hooks/session";

import { TransactingComponent } from "../../types/general";

import style from "./style";
import useStyles from "../../hooks/styles";
import { useNetwork } from "../../hooks/network";
import {
  DEFAULT_LIQUIDITY_PATH,
  DEFAULT_SWAP_PATH,
  getLiquidityPath,
  getSwapPath,
} from "../../tradeRouting";

interface NavTabProps extends Omit<TabProps, "onClick"> {
  href: string;
  scalingKey?: string;
  onNavigate?: (href: string) => void;
}

function NavTab({ href, scalingKey, onNavigate, ...tabProps }: NavTabProps) {
  const navigate = useNavigate();
  const styles = useStyles(style, scalingKey);
  return (
    <Tab
      {...tabProps}
      disableRipple
      sx={styles.navHome.tab}
      onClick={(event) => {
        event.preventDefault();
        if (onNavigate) onNavigate(href);
        else navigate(href);
      }}
    />
  );
}

export interface INavHome {
  scalingKey?: string;
  onNavigate?: (href: string) => void;
  isTransitioning?: boolean;
}
export const NavHome: FC<INavHome> = (props) => {
  const styles = useStyles(style, props.scalingKey);
  const [value, setValue] = useState(0);
  const sessionInfo = useSession();
  const network = useNetwork();
  const location = useLocation();
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
    if (!network.selectedPool) return DEFAULT_LIQUIDITY_PATH;

    if (sessionInfo.activeComponent === TransactingComponent.REMOVE_LIQUIDITY) {
      return getLiquidityPath(network.selectedPool, "remove");
    }
    return getLiquidityPath(network.selectedPool);
  }, [network.selectedPool, sessionInfo.activeComponent]);

  const swapHref = (() => {
    if (location.pathname.startsWith("/swap/")) return location.pathname;
    if (!network.selectedPool) return DEFAULT_SWAP_PATH;
    return getSwapPath(
      network.selectedPool.tokenA,
      network.selectedPool.tokenB
    );
  })();

  return (
    <Tabs
      value={value}
      sx={styles.navHome.root}
      onChange={handleChange}
      aria-label="nav-home-tabs"
      aria-busy={props.isTransitioning}
    >
      <NavTab
        label="Swap"
        href={swapHref}
        scalingKey={props.scalingKey}
        onNavigate={props.onNavigate}
        disabled={props.isTransitioning}
      />
      <NavTab
        label="Liquidity"
        href={liquidityHref()}
        scalingKey={props.scalingKey}
        onNavigate={props.onNavigate}
        disabled={props.isTransitioning}
      />
    </Tabs>
  );
};
