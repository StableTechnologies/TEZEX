import { Theme } from "@mui/material/styles";

export const getNetworkSelectorStyles = (theme: Theme) => {
  void theme;

  return {
    button: {
      height: "36px",
      minHeight: "36px",
      maxHeight: "36px",
      padding: "0 10px",
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      color: "var(--tezex-text)",
      background: "transparent",
      border: "1px solid var(--tezex-line-soft)",
      borderRadius: "999px",
      boxShadow: "none",
      appearance: "none",
      cursor: "pointer",
      transition:
        "background-color 160ms ease, border-color 160ms ease, color 160ms ease",
      "&:hover": {
        background: "var(--tezex-hover)",
        borderColor: "var(--tezex-line-strong)",
      },
      "&:focus-visible": {
        outline: "2px solid var(--tezex-text-secondary)",
        outlineOffset: "-3px",
      },
    },

    liveSignal: {
      position: "relative",
      width: "8px",
      height: "8px",
      flexShrink: 0,
      background: "var(--tezex-network-live)",
      borderRadius: "999px",
      "&::after": {
        content: '""',
        position: "absolute",
        inset: "-5px",
        border: "1px solid var(--tezex-network-live)",
        borderRadius: "999px",
        animation: "tezexNetworkLivePulse 1.8s ease-out infinite",
      },
      "@keyframes tezexNetworkLivePulse": {
        "0%": { transform: "scale(0.45)", opacity: 0.65 },
        "70%, 100%": { transform: "scale(1.15)", opacity: 0 },
      },
      "@media (prefers-reduced-motion: reduce)": {
        "&::after": { animation: "none", opacity: 0.28 },
      },
    },

    networkIdentity: {
      display: "flex",
      alignItems: "center",
    },
    networkLabel: {
      color: "var(--tezex-muted)",
      fontSize: "12px",
      fontWeight: 600,
      lineHeight: 1,
      letterSpacing: "0.01em",
      userSelect: "none",
    },
    arrow: {
      width: "10px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--tezex-muted)",
      fontSize: "10px",
      lineHeight: 1,
      transition: "transform 180ms ease",
      "@media (prefers-reduced-motion: reduce)": { transition: "none" },
    },

    popover: {
      width: "240px",
      marginTop: "8px",
      overflow: "hidden",
      color: "var(--tezex-text)",
      background: "var(--tezex-panel)",
      border: "1px solid var(--tezex-line)",
      borderRadius: "18px",
      boxShadow: "var(--tezex-menu-shadow)",
    },
    infoSection: {
      padding: "15px 16px",
      background: "var(--tezex-panel-subtle)",
      borderBottom: "1px solid var(--tezex-line-soft)",
    },
    infoRow: {
      minHeight: "28px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "16px",
    },
    infoLabel: {
      color: "var(--tezex-muted)",
      fontSize: "11px",
      fontWeight: 500,
    },
    infoValue: {
      color: "var(--tezex-text-secondary)",
      fontFamily: '"Red Hat Mono", monospace',
      fontSize: "11px",
      fontWeight: 500,
    },
    infoLink: {
      color: "var(--tezex-text-secondary)",
      fontFamily: '"Red Hat Mono", monospace',
      fontSize: "11px",
      fontWeight: 500,
      textDecorationColor: "var(--tezex-faint)",
      textUnderlineOffset: "3px",
      "&:hover": {
        color: "var(--tezex-text)",
        textDecorationColor: "var(--tezex-text)",
      },
    },
    listItem: {
      minHeight: "44px",
      padding: "0 16px",
      color: "var(--tezex-muted)",
      transition: "background-color 150ms ease, color 150ms ease",
      "&:hover": {
        color: "var(--tezex-text)",
        background: "var(--tezex-hover)",
      },
      "&.Mui-selected": {
        color: "var(--tezex-text)",
        background: "var(--tezex-panel-subtle)",
        "&:hover": { background: "var(--tezex-hover)" },
      },
    },
    listItemText: {
      color: "inherit",
      fontSize: "12px",
      letterSpacing: "0.01em",
    },
  };
};
