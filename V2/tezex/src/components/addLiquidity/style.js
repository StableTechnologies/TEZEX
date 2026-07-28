// eslint-disable-next-line
const style = (theme, scale = 1) => {
  return {
    root: {
      width: "100%",
      maxWidth: "760px",
      margin: "0 auto",
      display: "flex",
      justifyContent: "center",
      paddingBottom: { xs: "24px", md: "36px" },
    },
    card: {
      width: "100%",
      overflow: "hidden",
      color: "var(--tezex-text)",
      background: "var(--tezex-panel)",
      border: "1px solid var(--tezex-line)",
      borderRadius: { xs: "20px", sm: "24px" },
      boxShadow: "var(--tezex-shadow)",
      "&.MuiPaper-root": { boxShadow: "var(--tezex-shadow)" },
    },
    cardHeader: {
      padding: { xs: "18px", sm: "20px 22px" },
      borderBottom: "1px solid var(--tezex-line-soft)",
      "& .MuiCardHeader-content": { width: "100%" },
    },
    headerContent: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "18px",
      "@media (max-width: 620px)": {
        alignItems: "stretch",
        flexDirection: "column",
      },
    },
    titleGroup: {
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      textAlign: "left",
    },
    eyebrow: {
      color: "var(--tezex-muted)",
      fontSize: "10px",
      fontWeight: 700,
      letterSpacing: "0.18em",
      lineHeight: 1.2,
    },
    poolSelector: {
      width: { xs: "100%", sm: "220px" },
      minWidth: { xs: 0, sm: "220px" },
      flexShrink: 0,
    },
    cardContent: {
      padding: { xs: "16px", sm: "20px" },
      "&.MuiCardContent-root:last-child": {
        paddingBottom: { xs: "16px", sm: "20px" },
      },
    },
    fieldsRow: {
      display: "grid",
      gridTemplateColumns: "minmax(0, 1fr) 44px minmax(0, 1fr)",
      alignItems: "center",
      gap: "10px",
      "@media (max-width: 620px)": {
        gridTemplateColumns: "minmax(0, 1fr)",
        gap: 0,
      },
    },
    input: {
      width: "100%",
      minWidth: 0,
    },
    depositOrderToggle: {
      width: "44px",
      height: "44px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      justifySelf: "center",
      "@media (max-width: 620px)": {
        width: "44px",
        height: "44px",
        margin: 0,
        zIndex: 2,
      },
    },
    infoGrid: {
      marginTop: "14px",
      padding: "0 4px",
      display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "5px",
      color: "var(--tezex-muted)",
    },
    infoText: {
      color: "var(--tezex-muted)",
      fontFamily: '"Red Hat Mono", monospace',
      fontSize: "11px",
      lineHeight: 1.5,
    },
    infoTextIcon: {
      width: "17px",
      height: "17px",
      objectFit: "contain",
    },
    infoReceive: {
      color: "var(--tezex-text-secondary)",
      fontFamily: '"Red Hat Mono", monospace',
      fontSize: "11px",
      fontWeight: 600,
      lineHeight: 1.5,
    },
    cardAction: {
      padding: 0,
      display: "flex",
      alignItems: "stretch",
      flexDirection: "column",
    },
    wallet: {
      width: "100%",
      padding: { xs: "0 16px 16px", sm: "0 20px 20px" },
    },
    slippageBox: {
      width: "100%",
      padding: { xs: "15px 16px", sm: "16px 20px" },
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "14px",
      background: "var(--tezex-panel-subtle)",
      borderTop: "1px solid var(--tezex-line-soft)",
      "@media (max-width: 420px)": {
        alignItems: "stretch",
        flexDirection: "column",
      },
    },
    slippageCopy: {
      display: "flex",
      flexDirection: "column",
      gap: "2px",
    },
    slippageLabel: {
      color: "var(--tezex-text-secondary)",
      fontSize: "12px",
      fontWeight: 600,
      lineHeight: 1.35,
    },
    slippageHelp: {
      color: "var(--tezex-faint)",
      fontSize: "10px",
      lineHeight: 1.45,
    },
  };
};

export default style;
