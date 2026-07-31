import React from "react";
import "./index.css";
import { ThemeProvider } from "@mui/system";
import theme from "./theme";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { SessionProvider } from "./contexts/session";
import ReactDOM from "react-dom/client";
import {
  createHashRouter,
  Navigate,
  RouterProvider,
  useLocation,
} from "react-router-dom";

import { AppConfig } from "./types/general";
import appConfig from "./config/app.json";
import { Home } from "./pages/Home";
import { Analytics } from "./pages/Analytics";
import { Stez } from "./pages/Stez";
import { NotFound } from "./pages/NotFound";
import { ColorModeProvider } from "./contexts/color-mode";
import { canonicalTezexUrl, isStezOnlyHost } from "./routing";

const CanonicalTezexRedirect = () => {
  const location = useLocation();

  React.useEffect(() => {
    window.location.replace(
      canonicalTezexUrl(location.pathname, location.search)
    );
  }, [location.pathname, location.search]);

  return null;
};

const standardRoutes = [
  {
    index: true,
    element: <Navigate to="/home/swap" replace />,
  },
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
  {
    path: "*",
    element: <NotFound />,
  },
];

const stezOnlyRoutes = [
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <Navigate to="/stez" replace />,
      },
      {
        path: "stez",
        element: <Stez />,
      },
    ],
  },
  {
    path: "home/*",
    element: <CanonicalTezexRedirect />,
  },
  {
    path: "analytics",
    element: <CanonicalTezexRedirect />,
  },
  {
    path: "*",
    element: <Navigate to="/stez" replace />,
  },
];

const router = createHashRouter(
  isStezOnlyHost(window.location.hostname)
    ? stezOnlyRoutes
    : [
        {
          path: "/",
          element: <App />,
          children: standardRoutes,
        },
      ]
);
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
