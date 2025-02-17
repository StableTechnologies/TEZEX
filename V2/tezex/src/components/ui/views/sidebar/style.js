// eslint-disable-next-line
const style = (theme, scale = 1) => {
  return {
    drawer: {
      width: "60vw",
      flexShrink: 0,
      "& .MuiDrawer-paper": {
        width: "60vw",
        boxSizing: "border-box",
        backgroundColor: theme.palette.primary.main,
        boxShadow: `0px 0px calc(0.7vw * ${scale}) 0px rgba(0,0,0,0.15)`,
        borderRight: "0px",
      },
    },
    drawerClosed: {
      width: 70,
      "& .MuiDrawer-paper": {
        width: 70,
      },
    },
    menuButton: {
      padding: 0,
      gap: 1,
    },
    homeItem: {
      paddingTop: "10%",
    },
    listItem: {
      backgroundColor: theme.palette.primary.main,
      "& .MuiButtonBase-root": {
        color: theme.palette.text.disabled,
        "&:hover": {
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.text.primary,
        },
        "&.Mui-selected": {
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.text.primary,
        },
      },
    },
    menuItemClosed: {
      justifyContent: "center",
    },
    menuItemOpened: {
      justifyContent: "flex-start",
    },
    listItemText: {
      textAlign: "right",
      "& .MuiTypography-root": {
        fontSize: `calc(3vw * ${scale})`,
      },
    },
    swapButton: {
      paddingLeft: 4,
    },
    swapText: {
      textAlign: "right",
      paddingRight: 4,
      "& .MuiTypography-root": {
        fontSize: `calc(2.9vw * ${scale})`,
      },
    },
    liquidityButton: {
      paddingLeft: 4,
    },
    liquidityText: {
      textAlign: "right",
      paddingRight: 4,
      "& .MuiTypography-root": {
        fontSize: `calc(2.9vw * ${scale})`,
      },
    },
    nestedButton: {
      paddingLeft: 6,
    },
    nestedText: {
      textAlign: "right",
      paddingRight: 7,
      "& .MuiTypography-root": {
        fontSize: `calc(2.8vw * ${scale})`,
      },
    },
    logo: {
      display: "none",
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      "@media (max-width: 900px) and (orientation: landscape)": {
        display: "flex",
      },
    },
  };
};

export default style;
