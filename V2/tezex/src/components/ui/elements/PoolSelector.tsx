import React, { FC, useEffect } from "react";
import { useNetwork } from "../../../hooks/network";
import { PoolConfig } from "../../../types/pools";
import FormControl from "@mui/material/FormControl";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { SxProps, Theme } from "@mui/material/styles";
import useStyles from "../../../hooks/styles";

export interface PoolSelectorProps {
  onChange: (poolId: string) => void;
  disabled?: boolean;
  sx?: SxProps<Theme>;
  scalingKey?: string;
  showBalance?: boolean;
  getPoolBalance?: (poolId: string) => string;
}

const poolSelectorStyles = (theme: any, scale = 1) => ({
  selectedValue: {
    logoSize: scale * 20,
    logoBorder: scale * 1.5,
    logoOverlap: scale * -6,
    titleFontSize: `calc(0.75rem * ${scale})`,
    subtitleFontSize: `calc(0.6rem * ${scale})`,
    gap: scale * 0.8,
  },
  menuOption: {
    logoSize: scale * 24,
    logoBorder: scale * 2,
    logoOverlap: scale * -8,
    titleFontSize: `calc(0.875rem * ${scale})`,
    subtitleFontSize: `calc(0.75rem * ${scale})`,
    balanceLabelFontSize: `calc(0.75rem * ${scale})`,
    balanceValueFontSize: `calc(0.65rem * ${scale})`,
    gap: scale * 1.2,
  },
});

export const PoolSelector: FC<PoolSelectorProps> = ({
  onChange,
  disabled = false,
  sx = {},
  scalingKey = "default",
  showBalance = false,
  getPoolBalance,
}) => {
  const network = useNetwork();
  const availablePools = network.getAllPools();
  const selectedPool = network.selectedPool;

  const styles = useStyles(poolSelectorStyles, scalingKey);

  useEffect(() => {
    if (!selectedPool && availablePools.length > 0) {
      network.setSelectedPool(availablePools[0]);
    }
  }, [selectedPool, availablePools, network]);

  const handleChange = (event: SelectChangeEvent<string>) => {
    onChange(event.target.value);
  };

  const renderSelectedValue = (poolId: string) => {
    const pool = availablePools.find((p) => p.id === poolId);
    if (!pool) return null;

    const tokenA = network.getAsset(pool.tokenA);
    const tokenB = network.getAsset(pool.tokenB);
    const s = styles.selectedValue;

    return (
      <Box display="flex" alignItems="center" gap={s.gap}>
        {/* Token logos */}
        <Box display="flex" alignItems="center" position="relative">
          <img
            src={process.env.PUBLIC_URL + tokenA.logo}
            alt={tokenA.label}
            style={{
              width: s.logoSize,
              height: s.logoSize,
              borderRadius: "50%",
              border: `${s.logoBorder}px solid #E1E1E1`,
              position: "relative",
              zIndex: 2,
              backgroundColor: "white",
            }}
          />
          <img
            src={process.env.PUBLIC_URL + tokenB.logo}
            alt={tokenB.label}
            style={{
              width: s.logoSize,
              height: s.logoSize,
              borderRadius: "50%",
              border: `${s.logoBorder}px solid #E1E1E1`,
              marginLeft: s.logoOverlap,
              position: "relative",
              zIndex: 1,
              backgroundColor: "white",
            }}
          />
        </Box>

        {/* Pool text - two lines */}
        <Box display="flex" flexDirection="column" gap={0.1}>
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: s.titleFontSize,
              lineHeight: 1.1,
              color: "#1E1E1E",
            }}
          >
            {pool.name}
          </Typography>
          <Typography
            sx={{
              fontSize: s.subtitleFontSize,
              lineHeight: 1,
              color: "#888",
            }}
          >
            {tokenA.label}/{tokenB.label}
          </Typography>
        </Box>
      </Box>
    );
  };

  const renderPoolOption = (pool: PoolConfig) => {
    const tokenA = network.getAsset(pool.tokenA);
    const tokenB = network.getAsset(pool.tokenB);
    const s = styles.menuOption;

    const balance =
      showBalance && getPoolBalance ? getPoolBalance(pool.id) : null;

    return (
      <Box
        display="flex"
        alignItems="center"
        gap={s.gap}
        sx={{ py: 0.5, width: "100%" }}
      >
        {/* Token logos */}
        <Box display="flex" alignItems="center" position="relative">
          <img
            src={process.env.PUBLIC_URL + tokenA.logo}
            alt={tokenA.label}
            style={{
              width: s.logoSize,
              height: s.logoSize,
              borderRadius: "50%",
              border: `${s.logoBorder}px solid #E1E1E1`,
              position: "relative",
              zIndex: 2,
            }}
          />
          <img
            src={process.env.PUBLIC_URL + tokenB.logo}
            alt={tokenB.label}
            style={{
              width: s.logoSize,
              height: s.logoSize,
              borderRadius: "50%",
              border: `${s.logoBorder}px solid #E1E1E1`,
              marginLeft: s.logoOverlap,
              position: "relative",
              zIndex: 1,
            }}
          />
        </Box>

        {/* Pool info */}
        <Box display="flex" flexDirection="column" gap={0.25} flex={1}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              fontSize: s.titleFontSize,
              lineHeight: 1.2,
              color: "#1E1E1E",
            }}
          >
            {pool.name}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontSize: s.subtitleFontSize,
              lineHeight: 1,
              color: "#666666",
              opacity: 0.9,
            }}
          >
            {tokenA.label} / {tokenB.label}
          </Typography>
        </Box>
        {/* Right side: Balance */}
        {balance && (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="flex-end"
            gap={0.1}
          >
            <Typography
              sx={{
                fontSize: s.balanceLabelFontSize,
                lineHeight: 1.2,
                color: "#999",
                fontWeight: 500,
              }}
            >
              Balance
            </Typography>
            <Typography
              sx={{
                fontSize: s.balanceFontSize,
                lineHeight: 1.2,
                color: "#333",
                fontWeight: 400,
                whiteSpace: "nowrap",
              }}
            >
              {balance} {"LP"}
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <FormControl sx={sx}>
      <Select
        value={selectedPool?.id}
        onChange={handleChange}
        disabled={disabled}
        size="small"
        renderValue={renderSelectedValue}
        sx={{
          borderRadius: 3,
          "& .MuiSelect-select": {
            display: "flex",
            alignItems: "center",
          },
          "& .MuiOutlinedInput-notchedOutline": {
            border: "none",
          },
          "&.Mui-disabled": {
            backgroundColor: "rgba(0, 0, 0, 0.02)",
            opacity: 0.6,
          },
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              borderRadius: 2,
              mt: 0.5,
              backgroundColor: "#FFFFFF",
              border: "1px solid #E1E1E1",
              boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
              maxHeight: 400,
              "& .MuiMenuItem-root": {
                paddingY: 1,
                paddingX: 1.5,
                minHeight: 48,
                color: "#1E1E1E",

                "&:hover": {
                  backgroundColor: "#F5F5F5",
                },

                "&.Mui-selected": {
                  backgroundColor: "#E8E8E8",
                  "&:hover": {
                    backgroundColor: "#DDDDDD",
                  },
                },
              },
            },
          },
        }}
      >
        {availablePools.map((pool) => (
          <MenuItem key={pool.id} value={pool.id}>
            {renderPoolOption(pool)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
