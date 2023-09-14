import React, { FC } from "react";

import style from "./style";
import useStyles from "../../../hooks/styles";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import infoIcon from "../../../assets/infoIcon.svg";

import xtzTzbtcIcon from "../../../assets/xtzTzbtcIcon.svg";
import sirsIcon from "../../../assets/sirsIcon.svg";
import rightArrow from "../../../assets/rightArrow.svg";
interface ISlippageLabel {
  scale?: number;
}
export const SlippageLabel: FC<ISlippageLabel> = (props) => {
  const styles = useStyles(style, props.scale || 1);
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
export const AddliquidityTokens: FC = () => {
  const styles = useStyles(style);
  return (
    <Box sx={styles.addLiquidityTokens}>
      <img
        style={styles.addLiquidityTokens.sendAssetsIcon}
        src={xtzTzbtcIcon}
        alt="xtzTzbtcIcon"
      />
      <img
        style={styles.addLiquidityTokens.rightArrow}
        src={rightArrow}
        alt="rightArrow"
      />
      <img
        style={styles.addLiquidityTokens.recieveAssetIcon}
        src={sirsIcon}
        alt="sirsIcon"
      />
    </Box>
  );
};
