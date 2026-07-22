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
  variant?: "default" | "dark";
}

const poolSelectorStyles = (_theme: Theme, scale = 1) => ({
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
  variant = "default",
}) => {
  const network = useNetwork();
  const availablePools = network.getAllPools();
  const selectedPool = network.selectedPool;

  const styles = useStyles(poolSelectorStyles, scalingKey);
  const isDark = variant === "dark";

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
              border: `${s.logoBorder}px solid ${
                isDark ? "var(--tezex-line)" : "#E1E1E1"
              }`,
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
              border: `${s.logoBorder}px solid ${
                isDark ? "var(--tezex-line)" : "#E1E1E1"
              }`,
              marginLeft: s.logoOverlap,
              position: "relative",
              zIndex: 1,
              backgroundColor: "white",
            }}
          />
        </Box>

        {/* Pool text - two lines */}
        <Box
          display="flex"
          flexDirection="column"
          alignItems="flex-start"
          minWidth={0}
          gap={0.1}
          sx={{ textAlign: "left" }}
        >
          <Typography
            sx={{
              width: "100%",
              textAlign: "left",
              fontWeight: 600,
              fontSize: s.titleFontSize,
              lineHeight: 1.1,
              color: isDark ? "var(--tezex-text)" : "#1E1E1E",
            }}
          >
            {pool.name}
          </Typography>
          <Typography
            sx={{
              width: "100%",
              textAlign: "left",
              fontSize: s.subtitleFontSize,
              lineHeight: 1,
              color: isDark ? "var(--tezex-muted)" : "#888",
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
              border: `${s.logoBorder}px solid ${
                isDark ? "var(--tezex-line)" : "#E1E1E1"
              }`,
              backgroundColor: "white",
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
              border: `${s.logoBorder}px solid ${
                isDark ? "var(--tezex-line)" : "#E1E1E1"
              }`,
              marginLeft: s.logoOverlap,
              position: "relative",
              zIndex: 1,
              backgroundColor: "white",
            }}
          />
        </Box>

        {/* Pool info */}
        <Box
          display="flex"
          flexDirection="column"
          alignItems="flex-start"
          minWidth={0}
          gap={0.25}
          flex={1}
          sx={{ textAlign: "left" }}
        >
          <Typography
            variant="body2"
            sx={{
              width: "100%",
              textAlign: "left",
              fontWeight: 600,
              fontSize: s.titleFontSize,
              lineHeight: 1.2,
              color: isDark ? "var(--tezex-text)" : "#1E1E1E",
            }}
          >
            {pool.name}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              width: "100%",
              textAlign: "left",
              fontSize: s.subtitleFontSize,
              lineHeight: 1,
              color: isDark ? "var(--tezex-muted)" : "#666666",
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
                color: isDark ? "var(--tezex-muted)" : "#999",
                fontWeight: 500,
              }}
            >
              Balance
            </Typography>
            <Typography
              sx={{
                fontSize: s.balanceValueFontSize,
                lineHeight: 1.2,
                color: isDark ? "var(--tezex-text-secondary)" : "#333",
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
        inputProps={{ "aria-label": "Select liquidity pool" }}
        value={selectedPool?.id}
        onChange={handleChange}
        disabled={disabled}
        size="small"
        renderValue={renderSelectedValue}
        sx={{
          borderRadius: "999px",
          minHeight: 42,
          color: isDark ? "var(--tezex-text)" : "#1E1E1E",
          backgroundColor: isDark ? "var(--tezex-panel-subtle)" : "#FAFAFA",
          border: `1px solid ${isDark ? "var(--tezex-line)" : "#E1E1E1"}`,
          "& .MuiSelect-select": {
            display: "flex",
            alignItems: "center",
            padding: "7px 38px 7px 12px",
          },
          "& .MuiSelect-icon": {
            color: isDark ? "var(--tezex-muted)" : "inherit",
          },
          "& .MuiOutlinedInput-notchedOutline": {
            border: "none",
          },
          "&:hover": {
            borderColor: isDark ? "var(--tezex-line-strong)" : "#CCCCCC",
          },
          "&.Mui-disabled": {
            backgroundColor: isDark
              ? "var(--tezex-panel-subtle)"
              : "rgba(0, 0, 0, 0.02)",
            opacity: 0.72,
          },
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              borderRadius: 2,
              mt: 0.5,
              backgroundColor: isDark ? "var(--tezex-panel)" : "#FFFFFF",
              border: `1px solid ${isDark ? "var(--tezex-line)" : "#E1E1E1"}`,
              boxShadow: isDark
                ? "var(--tezex-menu-shadow)"
                : "0px 18px 48px rgba(0, 0, 0, 0.18)",
              maxHeight: 400,
              "& .MuiMenuItem-root": {
                paddingY: 1,
                paddingX: 1.5,
                minHeight: 48,
                color: isDark ? "var(--tezex-text)" : "#1E1E1E",

                "&:hover": {
                  backgroundColor: isDark ? "var(--tezex-hover)" : "#F5F5F5",
                },

                "&.Mui-selected": {
                  backgroundColor: isDark
                    ? "var(--tezex-line-soft)"
                    : "#E8E8E8",
                  "&:hover": {
                    backgroundColor: isDark ? "var(--tezex-line)" : "#DDDDDD",
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
