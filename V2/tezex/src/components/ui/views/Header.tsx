import React, { FC } from "react";
import { Wallet } from "../../wallet/Wallet";
import { NavApp } from "../../nav";

import Box from "@mui/material/Box";
import logo from "../../../assets/TezexLogo.svg";

const style = {
  root: {
    backgroundColor: "red",
  },
  right: {
    justifyContent: "center",
    alignContent: "center",
  },
  header: {
    fontSize: "1.5vw",
    display: "flex",
    alignItems: "center",
    width: "100%",
    minHeight: "5vw",
    left: "0px",
    top: "0px",
    background: "#FFFFFF",
    boxShadow: "4px 4px 4px rgba(204, 204, 204, 0.25)",
  },
};

export const Header: FC = () => {
  return (
    <Box sx={style.header}>
      <Box>
        <img
          style={{
            maxWidth: "11.35vw",
          }}
          src={logo}
          alt="Logo"
        />
      </Box>

      <Box
        sx={{
          alignContent: "center",
        }}
      >
        <NavApp />
      </Box>
      <Box
        sx={{
          position: "relative",
          left: "51vw",
          justifyContent: "flexend",
          display: "flex",
        }}
      >
        <Wallet variant={"header"} />
      </Box>
    </Box>
  );
};
export {};
