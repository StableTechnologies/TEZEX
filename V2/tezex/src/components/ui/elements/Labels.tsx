import React, { FC } from "react";

import style from "./style";
import useStyles from "../../../hooks/styles";
import { useNetwork } from "../../../hooks/network";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";

import infoIcon from "../../../assets/infoIcon.svg";
import rightArrow from "../../../assets/rightArrow.svg";

interface ISlippageLabel {
  scalingKey?: string;
}
export const SlippageLabel: FC<ISlippageLabel> = (props) => {
  const styles = useStyles(style, props.scalingKey);
  return (
    <Box sx={styles.slippageLabel.box}>
      <Box>
        <Typography sx={styles.slippageLabel.typography}>Slippage</Typography>
      </Box>
      <Box sx={styles.slippageLabel.box}>
        <Tooltip
          title={
            <div>
              {" "}
              Slippage limits how much your trade <br /> price can vary from
              your desired price.
            </div>
          }
          componentsProps={{
            tooltip: {
              sx: styles.slippageLabel.info.tooltip,
            },
          }}
        >
          <img
            style={styles.slippageLabel.info.icon}
            src={infoIcon}
            alt="Logo"
          />
        </Tooltip>
      </Box>
    </Box>
  );
};
interface IAddLiquidityTokens {
  poolId: string;
  scalingKey?: string;
}

export const AddliquidityTokens: FC<IAddLiquidityTokens> = (props) => {
  const styles = useStyles(style, props.scalingKey);
  const network = useNetwork();

  // Get pool config
  const pool = network.getAllPools().find((p) => p.id === props.poolId);

  if (!pool) {
    console.error(`Pool not found: ${props.poolId}`);
    return null;
  }

  // Get assets
  const tokenA = network.getAsset(pool.tokenA);
  const tokenB = network.getAsset(pool.tokenB);
  const lpToken = network.getAsset(pool.lpToken);

  return (
    <Box sx={styles.addLiquidityTokens}>
      {/* Send assets with label */}
      <Box sx={styles.addLiquidityTokens.sendAssetsContainer}>
        {/* Overlapping icons */}
        <Box sx={styles.addLiquidityTokens.sendAssetsIconsWrapper}>
          <img
            style={styles.addLiquidityTokens.sendAssetIcon}
            src={process.env.PUBLIC_URL + tokenA.logo}
            alt={tokenA.label}
          />
          <img
            style={styles.addLiquidityTokens.sendAssetIcon2}
            src={process.env.PUBLIC_URL + tokenB.logo}
            alt={tokenB.label}
          />
        </Box>
        {/* Label with token names */}
        <Typography sx={styles.addLiquidityTokens.sendAssetsLabel}>
          {tokenA.label}/{tokenB.label}
        </Typography>
      </Box>

      {/* Arrow */}
      <img
        style={styles.addLiquidityTokens.rightArrow}
        src={rightArrow}
        alt="arrow"
      />

      {/* Receive asset with label */}
      <Box sx={styles.addLiquidityTokens.receiveAssetContainer}>
        {/* LP token icon */}
        <img
          style={styles.addLiquidityTokens.receiveAssetIcon}
          src={process.env.PUBLIC_URL + lpToken.logo}
          alt={lpToken.label}
        />
        {/* Label with LP token name */}
        <Typography sx={styles.addLiquidityTokens.receiveAssetLabel}>
          {lpToken.label}
        </Typography>
      </Box>
    </Box>
  );
};
