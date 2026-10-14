import React from "react";
import Button, { ButtonProps } from "@mui/material/Button";

// Shared by swap, liquidity, and sTEZ so every transaction state uses the
// same geometry, typography, and theme colors.
const primaryActionStyle = {
  width: "100%",
  minHeight: "54px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 16px",
  background: "var(--tezex-action)",
  color: "var(--tezex-action-text)",
  border: "1px solid var(--tezex-action)",
  borderRadius: "999px",
  fontFamily: "Inter, sans-serif",
  fontWeight: 700,
  fontSize: "15px",
  lineHeight: 1.35,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  textAlign: "center",
  transition: "background-color 160ms ease, transform 160ms ease",
  "&:hover": {
    background: "var(--tezex-action-hover)",
    transform: "translateY(-1px)",
  },
  "&.Mui-disabled": {
    color: "var(--tezex-muted)",
    background: "var(--tezex-panel-subtle)",
    borderColor: "var(--tezex-line)",
    letterSpacing: "0.05em",
  },
} as const;

export const PrimaryActionButton = ({ sx = [], ...props }: ButtonProps) => (
  <Button
    type="button"
    size="large"
    {...props}
    sx={[primaryActionStyle, ...(Array.isArray(sx) ? sx : [sx])]}
  />
);
