// eslint-disable-next-line
const style = (theme, scale = 1) => {
  return {
    root: {
      minHeight: "calc(100vh - 76px)",
      width: "100%",
      position: "relative",
      alignItems: "stretch",
      flexDirection: "column",
      justifyContent: "flex-start",
      display: "flex",
      background: "var(--tezex-bg)",
    },
  };
};

export default style;
