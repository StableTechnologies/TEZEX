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
    cardcontent: {
      padding: { xs: "16px", sm: "20px" },
      "&.MuiCardContent-root:last-child": {
        paddingBottom: { xs: "16px", sm: "20px" },
      },
    },
    cardContentBox: {
      display: "grid",
      gridTemplateColumns: "minmax(0, 1fr) auto",
      alignItems: "center",
      gap: "12px",
      "@media (max-width: 440px)": {
        gridTemplateColumns: "minmax(0, 1fr)",
      },
    },
    input1: {
      width: "100%",
      minWidth: 0,
    },
    useMax: {
      minWidth: "78px",
      minHeight: "36px",
      padding: "0 14px",
      color: "var(--tezex-text-secondary)",
      background: "var(--tezex-panel-subtle)",
      border: "1px solid var(--tezex-line)",
      borderRadius: "999px",
      textTransform: "none",
      "&:hover": {
        color: "var(--tezex-text)",
        background: "var(--tezex-hover)",
        borderColor: "var(--tezex-line-strong)",
      },
      "@media (max-width: 440px)": { justifySelf: "end" },
    },
    useMaxTypographyDisabled: {
      color: "inherit",
      fontSize: "11px",
      fontWeight: 700,
    },
    useMaxTypographyEnabled: {
      color: "var(--tezex-action-text)",
      fontSize: "11px",
      fontWeight: 700,
    },
    useMaxActive: {
      color: "var(--tezex-action-text)",
      background: "var(--tezex-action)",
      borderColor: "var(--tezex-action)",
      "&:hover": {
        color: "var(--tezex-action-text)",
        background: "var(--tezex-action-hover)",
      },
    },
    receiveInfo: {
      marginTop: "14px",
      padding: "14px 16px",
      display: "flex",
      alignItems: "center",
      background: "var(--tezex-panel-subtle)",
      border: "1px solid var(--tezex-line-soft)",
      borderRadius: "15px",
    },
    receiveText: {
      color: "var(--tezex-muted)",
      fontFamily: '"Red Hat Mono", monospace',
      fontSize: "11px",
      lineHeight: 1.5,
    },
    receiveTokenAmount: {
      color: "var(--tezex-text-secondary)",
      fontFamily: '"Red Hat Mono", monospace',
      fontSize: "11px",
      fontWeight: 600,
    },
    receiveIcons: {
      width: "18px",
      height: "18px",
      margin: "0 5px",
      objectFit: "contain",
    },
    receivePlus: {
      padding: "0 5px",
      color: "var(--tezex-muted)",
    },
    cardAction: {
      padding: { xs: "0 16px 16px", sm: "0 20px 20px" },
      display: "block",
    },
    wallet: {
      width: "100%",
    },
  };
};

export default style;
