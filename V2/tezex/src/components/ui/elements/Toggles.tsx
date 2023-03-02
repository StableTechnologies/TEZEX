import { FC } from "react";
import Button from "@mui/material/Button";
import swapIcon from "../../../assets/swapIcon.svg";

import Box from "@mui/material/Box";
export interface IToggle {
  toggle: () => void;
}

export const SwapUpDownToggle: FC<IToggle> = (props) => {
  return (
    <Button
      sx={{
        minWidth: "2.4vw",
        minHeight: "2.4vw",

        maxWidth: "2.4vw",
        maxHeight: "2.4vw",
        boxShadow: "0px 0.28vw 1.38vw rgba(181, 181, 181, 0.25)",
        background: "#FFFFFF",
        borderRadius: ".55vw",
      }}
      onClick={props.toggle}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",

          minWidth: "2.2vw",
          minHeight: "2.2vw",
        }}
      >
        <img
          style={{
            padding: ".2vw",
            width: "100%",
            height: "100%",
          }}
          src={swapIcon}
          alt="swapIcon"
        />
      </Box>
    </Button>
  );
};
