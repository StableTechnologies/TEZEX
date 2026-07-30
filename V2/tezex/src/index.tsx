import React from "react";
import "./index.css";
import { ThemeProvider } from "@mui/system";
import theme from "./theme";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { SessionProvider } from "./contexts/session";
import ReactDOM from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";

import { AppConfig } from "./types/general";
import appConfig from "./config/app.json";
import { Home } from "./pages/Home";
import { Analytics } from "./pages/Analytics";
import { Stez } from "./pages/Stez";
import { ColorModeProvider } from "./contexts/color-mode";

const router = createHashRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "home/swap",
        element: <Home path="swap" />,
      },
      {
        path: "home/add",
        element: <Home path="add" />,
      },
      {
        path: "home/remove",
        element: <Home path="remove" />,
      },
      {
        path: "analytics",
        element: <Analytics />,
      },
      {
        path: "stez",
        element: <Stez />,
      },
    ],
  },
]);
const root = ReactDOM.createRoot(document.getElementById("root") as Element);

root.render(
  <React.StrictMode>
    <SessionProvider config={appConfig as AppConfig}>
      <ColorModeProvider>
        <ThemeProvider theme={theme}>
          <RouterProvider
            router={router}
            future={{ v7_startTransition: true }}
          />
        </ThemeProvider>
      </ColorModeProvider>
    </SessionProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
