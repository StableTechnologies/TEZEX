import { menuClasses } from "react-pro-sidebar";
// eslint-disable-next-line
const style = (theme, scale = 1) => {
  return {
    box: {
      display: "flex",
      width: "100%",
    },
    swap: {
      fontSize: "2.9vw", //collapsed ? "0px" : "3vw",
      textAlign: "right",
      justifyContent: "flex-end",
      paddingRight: "0px",
      position: "relative",
      right: "0px",
      padding: "0px 0px 0px 0px",
    },

    liquidity: {
      fontSize: "2.9vw", //collapsed ? "0px" : "3vw",
      backgroundColor: "#FEFEFE",
      paddingBottom: "10%",
    },
    home: {
      fontSize: "3vw", //collapsed ? "0px" : "3vw",
      backgroundColor: "#FEFEFE",
    },
    add: {
      //fontSize: "2.8vw",//collapsed ? "0px" : "3vw",
      backgroundColor: "#FEFEFE",
    },
    remove: {
      //  fontSize: "2.8vw",//collapsed ? "0px" : "3vw",
      backgroundColor: "#FEFEFE",
      paddingBottom: "10%",
    },
    root: {
      //boxShadow: "20px 20px 25px 20px rgba(0, 0, 0, 0.1)",
      fontSize: "3vw", //collapsed ? "0px" : "3vw",
      boxShadow: "0px 0px 10px 0px rgba(0,0,0,0.15)",
      borderRight: "0px",

      backgroundColor: theme.palette.primary.main,
      //backgroundColor: "#FEFEFE",
      textAlign: "right",
    },

    menuItem: {
      backgroundColor: theme.palette.primary.main,
      button: {
        color: theme.palette.text.disabled,
        [`&.${menuClasses.disabled}`]: {
          color: theme.palette.text.disabled,
        },
        [`&.${menuClasses.active}`]: {
          //          backgroundColor: 'red',
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.text.primary,
        },
        "&:hover": {
          backgroundColor: theme.palette.primary.main,

          color: theme.palette.text.primary,
          // backgroundColor: 'red'
        },
      },
    },
    menuRootClosed: {
      display: "none",
      //  paddingTop: "10%",
    },
    menuRootOpen: {
      display: "block",
      paddingTop: "10%",
    },
    menuItemActive: {
      // backgroundColor: theme.palette.primary.main,
      backgroundColor: "red",
      //backgroundColor: theme.palette.primary.main,
    },

    menuItem2: {
      fontSize: "2.5vw", //collapsed ? "0px" : "3vw",
      backgroundColor: theme.palette.primary.main,
    },
    menuItemActive2: {
      fontSize: "2.5vw", //collapsed ? "0px" : "3vw",
      backgroundColor: theme.palette.primary.main,
      //backgroundColor: "#000000"
      //backgroundColor: theme.palette.primary.main,
    },

    menuItem3: {
      backgroundColor: theme.palette.primary.main,
    },
    menuItemActive3: {
      backgroundColor: theme.palette.primary.main,
      //backgroundColor: "#000000"
      //backgroundColor: theme.palette.primary.main,
    },
  };
};

export default style;
