import React, { FC, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";

import style from "./style";
import useStyles from "../../hooks/styles";

import { useSession } from "../../hooks/session";
import Box from "@mui/material/Box";

interface NavTabProps {
  label: string;
  href: string;
  disabled?: boolean;
}

function NavTabExternal(props: NavTabProps) {
  return (
    <Tab
      sx={{}}
      onClick={(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
        event.preventDefault();
        window.open(props.href, "_blank");
      }}
      {...props}
    />
  );
}

// TODO: Fallback to old implementation when Analytics page is ready
function NavTab(props: NavTabProps) {
  const navigate = useNavigate();
  const { disabled, label, ...restProps } = props;
  return (
    <Box
      sx={{ position: "relative", display: "inline-flex", overflow: "visible" }}
    >
      <Tab
        sx={{
          opacity: disabled ? 0.7 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
        onClick={(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
          event.preventDefault();
          if (!disabled) {
            navigate(props.href);
          }
        }}
        label={label}
        disabled={disabled}
        {...restProps}
      />
      {disabled && (
        <Box
          sx={{
            position: "absolute",
            bottom: "18%",
            right: "0%",
            background: "transparent",
            backdropFilter: "blur(1px)",
            WebkitBackdropFilter: "blur(1px)",
            color: "var(--tezex-muted)",
            fontSize: { xs: "8px", md: "9px" },
            fontWeight: 700,
            padding: "3px 10px",
            textTransform: "uppercase",
            letterSpacing: "0.4px",
            transform: "rotate(-15deg)",
            transformOrigin: "center",
            pointerEvents: "none",
            zIndex: 10,
            borderRadius: "10px",
            whiteSpace: "nowrap",
          }}
        >
          Soon
        </Box>
      )}
    </Box>
  );
}

// function NavTab(props: NavTabProps) {
//   const navigate = useNavigate();
//   return (
//     <Tab
//       sx={{}}
//       onClick={(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
//         event.preventDefault();
//         navigate(props.href);
//       }}
//       {...props}
//     />
//   );
// }

interface INavApp {
  scalingKey?: string;
}

export const NavApp: FC<INavApp> = (props) => {
  const styles = useStyles(style, props.scalingKey);
  const [value, setValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const pageId = {
    home: 0,
    analytics: 1,
    about: 2,
  };

  const aboutRedirectUrl = useSession().appConfig.aboutRedirectUrl;

  useEffect(() => {
    if (loading) {
      navigate("home/swap");
      setValue(0);
      setLoading(false);
    }
  }, [loading, navigate]);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    event.preventDefault();
    if (newValue !== pageId.about) setValue(newValue);
  };

  return (
    <Tabs
      value={value}
      sx={styles.navApp}
      onChange={handleChange}
      aria-label="nav tabs "
      TabIndicatorProps={{
        style: { display: "none" },
      }}
    >
      <NavTab label="Home" href="/home/swap" />
      <NavTab disabled label="Analytics" href="/Analytics" />
      <NavTabExternal label="About" href={aboutRedirectUrl} />
    </Tabs>
  );
};
