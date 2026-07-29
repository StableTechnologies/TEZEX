import React, { FC } from "react";

import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import Typography from "@mui/material/Typography";

import { Asset } from "../../../types/general";
import { TokenIcon } from "./TokenIcon";

export interface TokenSelectorProps {
  asset: Asset;
  options: Asset[];
  onChange: (asset: Asset) => void;
  disabled?: boolean;
  ariaLabel: string;
}

export const TokenSelector: FC<TokenSelectorProps> = ({
  asset,
  options,
  onChange,
  disabled = false,
  ariaLabel,
}) => {
  const handleChange = (event: SelectChangeEvent<string>) => {
    const nextAsset = options.find(
      (option) => option.name === event.target.value
    );
    if (nextAsset) onChange(nextAsset);
  };

  const renderAsset = (selectedName: string) => {
    const selected =
      options.find((option) => option.name === selectedName) ?? asset;

    return (
      <Box display="flex" alignItems="center" gap="8px">
        <TokenIcon asset={selected} size={26} decorative />
        <Typography
          component="span"
          sx={{
            color: "var(--tezex-text)",
            fontSize: "13px",
            fontWeight: 700,
            letterSpacing: "0.02em",
          }}
        >
          {selected.label}
        </Typography>
      </Box>
    );
  };

  return (
    <FormControl sx={{ flexShrink: 0 }}>
      <Select
        value={asset.name}
        onChange={handleChange}
        disabled={disabled}
        size="small"
        inputProps={{ "aria-label": ariaLabel }}
        renderValue={renderAsset}
        sx={{
          minHeight: "38px",
          color: "var(--tezex-text)",
          background: "var(--tezex-panel-subtle)",
          border: "1px solid var(--tezex-line)",
          borderRadius: "999px",
          transition: "border-color 160ms ease, background-color 160ms ease",
          "& .MuiSelect-select": {
            display: "flex",
            alignItems: "center",
            padding: "5px 34px 5px 7px",
          },
          "& .MuiSelect-icon": {
            right: "9px",
            color: "var(--tezex-muted)",
            fontSize: "18px",
          },
          "& .MuiOutlinedInput-notchedOutline": { border: "none" },
          "&:hover": {
            borderColor: "var(--tezex-line-strong)",
            background: "var(--tezex-hover)",
          },
          "&.Mui-focused": {
            borderColor: "var(--tezex-text-secondary)",
            boxShadow: "0 0 0 3px var(--tezex-focus-ring)",
          },
          "&.Mui-disabled": {
            opacity: 0.68,
          },
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              marginTop: "6px",
              minWidth: "190px !important",
              maxHeight: "320px",
              overflow: "auto",
              color: "var(--tezex-text)",
              background: "var(--tezex-panel)",
              border: "1px solid var(--tezex-line)",
              borderRadius: "16px",
              boxShadow: "var(--tezex-menu-shadow)",
              "& .MuiMenuItem-root": {
                minHeight: "48px",
                gap: "10px",
                padding: "9px 12px",
                color: "var(--tezex-text)",
                "&:hover": { background: "var(--tezex-hover)" },
                "&.Mui-selected": {
                  background: "var(--tezex-line-soft)",
                  "&:hover": { background: "var(--tezex-line)" },
                },
              },
            },
          },
        }}
      >
        {options.map((option) => (
          <MenuItem key={option.name} value={option.name}>
            <TokenIcon asset={option} size={26} decorative />
            <Box minWidth={0}>
              <Typography
                sx={{
                  fontSize: "13px",
                  fontWeight: 700,
                  lineHeight: 1.2,
                }}
              >
                {option.label}
              </Typography>
              {option.name !== option.label && (
                <Typography
                  sx={{
                    marginTop: "2px",
                    color: "var(--tezex-muted)",
                    fontSize: "10px",
                    lineHeight: 1.2,
                  }}
                >
                  {option.name}
                </Typography>
              )}
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
