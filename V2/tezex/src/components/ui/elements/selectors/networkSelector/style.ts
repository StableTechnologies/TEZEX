import { Theme } from "@mui/material/styles";
import { NetworkType } from "@airgap/beacon-sdk";

type ColorScheme = {
  button: {
    background: string;
    hoverBackground: string;
    border: string;
  };
  iconCircle: {
    background: string;
    border: string;
    color: string;
  };
  text: {
    primary: string;
    secondary: string;
  };
  infoSection: {
    valueColor: string;
    linkColor: string;
    linkHoverColor: string;
  };
  listItem: {
    selectedTextColor: string;
    selectedBorderColor: string;
  };
};

export const getNetworkSelectorStyles = (
  theme: Theme,
  network: NetworkType
) => {
  const commonPopoverStyles = {
    popover: {
      background:
        "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)",
    },
    infoSection: {
      background:
        "linear-gradient(135deg, rgba(248, 250, 252, 0.5) 0%, rgba(241, 245, 249, 0.5) 100%)",
      border: "rgba(226, 232, 240, 0.6)",
    },
    selectedItem: {
      background:
        "linear-gradient(90deg, rgba(226, 232, 240, 0.6) 0%, rgba(241, 245, 249, 0.3) 100%)",
      hoverBackground:
        "linear-gradient(90deg, rgba(226, 232, 240, 0.8) 0%, rgba(241, 245, 249, 0.4) 100%)",
    },
  };

  const defaultScheme: ColorScheme = {
    button: {
      background:
        "linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.1) 100%)",
      hoverBackground:
        "linear-gradient(135deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.15) 100%)",
      border: "rgba(255, 255, 255, 0.3)",
    },
    iconCircle: {
      background:
        "linear-gradient(135deg, rgba(100, 100, 100, 0.2) 0%, rgba(80, 80, 80, 0.15) 100%)",
      border: "rgba(255, 255, 255, 0.2)",
      color: "#4a5568",
    },
    text: {
      primary: "#4a5568",
      secondary: "#64748b",
    },
    infoSection: {
      valueColor: "#475569",
      linkColor: "#64748b",
      linkHoverColor: "#475569",
    },
    listItem: {
      selectedTextColor: "#475569",
      selectedBorderColor: "#64748b",
    },
  };

  const colorSchemes: Partial<Record<NetworkType, ColorScheme>> = {
    [NetworkType.MAINNET]: {
      button: {
        background:
          "linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(37, 99, 235, 0.15) 100%)",
        hoverBackground:
          "linear-gradient(135deg, rgba(59, 130, 246, 0.35) 0%, rgba(37, 99, 235, 0.2) 100%)",
        border: "rgba(59, 130, 246, 0.3)",
      },
      iconCircle: {
        background: "transparent",
        border: "rgba(255, 255, 255, 0.55)",
        color: "#1e40af",
      },
      text: {
        primary: "#1e40af",
        secondary: "#3b82f6",
      },
      infoSection: {
        valueColor: "#1e3a8a",
        linkColor: "#1e40af",
        linkHoverColor: "#1e3a8a",
      },
      listItem: {
        selectedTextColor: "#1e40af",
        selectedBorderColor: "#2563eb",
      },
    },
    [NetworkType.SHADOWNET]: defaultScheme,
  };

  const colors = colorSchemes[network] ?? defaultScheme;

  return {
    button: {
      display: "flex",
      alignItems: "center",
      gap: { xs: 0.5, sm: 0.6, md: 0.8 },
      padding: { xs: "4px 10px", sm: "5px 12px", md: "6px 14px" },
      background: colors.button.background,
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      border: `1px solid ${colors.button.border}`,
      borderRadius: { xs: "14px", md: "18px" },
      cursor: "pointer",
      transition: "all 0.3s ease",
      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
      "&:hover": {
        background: colors.button.hoverBackground,
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.12)",
        transform: "translateY(-1px)",
      },
    },

    iconCircle: {
      width: { xs: 24, sm: 28, md: 32 },
      height: { xs: 24, sm: 28, md: 32 },
      borderRadius: "50%",
      background: colors.iconCircle.background,
      border: `3px solid ${colors.iconCircle.border}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: { xs: "11px", sm: "12px", md: "14px" },
      fontWeight: 600,
      color: colors.iconCircle.color,
      boxShadow: "inset 0 1px 3px rgba(0, 0, 0, 0.1)",
    },

    networkLabel: {
      color: colors.text.primary,
      fontSize: { xs: "13px", sm: "14px", md: "15px" },
      fontWeight: 600,
      userSelect: "none",
      display: "block",
      letterSpacing: "0.2px",
    },

    arrow: {
      color: colors.text.secondary,
      fontSize: { xs: "10px", sm: "11px", md: "12px" },
      transition: "transform 0.3s ease",
    },

    popover: {
      marginTop: 1.5,
      minWidth: { xs: 180, sm: 200, md: 220 },
      background: commonPopoverStyles.popover.background,
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderRadius: { xs: "6px", md: "6px" },
      boxShadow:
        "0px 8px 32px rgba(0, 0, 0, 0.12), 0px 2px 8px rgba(0, 0, 0, 0.08)",
      border: "1px solid rgba(255, 255, 255, 0.6)",
      overflow: "hidden",
    },

    infoSection: {
      padding: { xs: "10px 14px", md: "12px 18px" },
      borderBottom: `1px solid ${commonPopoverStyles.infoSection.border}`,
      background: commonPopoverStyles.infoSection.background,
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
    },

    infoRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      mb: 0.7,
      "&:last-child": {
        mb: 0,
      },
    },

    infoLabel: {
      fontSize: { xs: "11px", md: "12px" },
      color: "#94a3b8",
      fontWeight: 500,
    },

    infoValue: {
      fontSize: { xs: "11px", md: "12px" },
      fontWeight: 600,
      color: colors.infoSection.valueColor,
    },

    infoLink: {
      fontSize: { xs: "11px", md: "12px" },
      fontWeight: 600,
      color: colors.infoSection.linkColor,
      cursor: "pointer",
      transition: "color 0.2s ease",
      "&:hover": {
        color: colors.infoSection.linkHoverColor,
        textDecoration: "underline",
      },
    },

    listItem: {
      padding: { xs: "10px 14px", md: "12px 18px" },
      borderRadius: "6px",
      transition: "all 0.2s ease",
      borderLeft: "3px solid transparent",
      "&.Mui-selected": {
        background: commonPopoverStyles.selectedItem.background,
        borderLeft: `3px solid ${colors.listItem.selectedBorderColor}`,
        "&:hover": {
          background: commonPopoverStyles.selectedItem.hoverBackground,
        },
      },
      "&:hover": {
        background: "rgba(248, 250, 252, 0.6)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      },
    },

    listItemText: {
      fontSize: { xs: "13px", md: "14px" },
      letterSpacing: "0.2px",
    },
  };
};
