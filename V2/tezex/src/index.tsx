import React from "react";
import "./index.css";
import { Box, ThemeProvider } from "@mui/system";
import theme from "./theme";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { SessionProvider } from "./contexts/session";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";

import { Home } from "./pages/Home";
import { Analytics } from "./pages/Analytics";
import { About } from "./pages/About";

const router = createBrowserRouter(
  [
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
          path: "about",
          element: <About />,
        },
      ],
    },
  ],
  { basename: process.env.PUBLIC_URL }
);
const root = ReactDOM.createRoot(document.getElementById("root") as Element);

root.render(
  <React.StrictMode>
    <SessionProvider>
      <ThemeProvider theme={theme}>
        <Box>
          <RouterProvider router={router} />
        </Box>
      </ThemeProvider>
    </SessionProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
