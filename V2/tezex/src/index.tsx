import React from "react";
import "./index.css";
import { ThemeProvider } from "@mui/system";
import theme from "./theme";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { SessionProvider } from "./contexts/session";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  createMemoryRouter,
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
import {
  canonicalTezexUrl,
  isStezOnlyHost,
  routeFromLegacyHash,
  stezRouteFromHash,
} from "./routing";

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
    element: <Home path="swap" />,
  },
  {
    path: "liquidity",
    element: <Home path="add" />,
  },
  {
    path: "liquidity/remove",
    element: <Home path="remove" />,
  },
  {
    path: "home/swap",
    element: <Navigate to="/" replace />,
  },
  {
    path: "home/add",
    element: <Navigate to="/liquidity" replace />,
  },
  {
    path: "home/remove",
    element: <Navigate to="/liquidity/remove" replace />,
  },
  {
    path: "swap",
    element: <Navigate to="/" replace />,
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
    path: "swap",
    element: <CanonicalTezexRedirect />,
  },
  {
    path: "liquidity/*",
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

const stezOnlyHost = isStezOnlyHost(window.location.hostname);
const stezInitialRoute = stezRouteFromHash(window.location.hash);

if (!stezOnlyHost) {
  const legacyRoute = routeFromLegacyHash(window.location.hash);
  if (legacyRoute) {
    window.history.replaceState(window.history.state, "", legacyRoute);
  }
}

if (stezOnlyHost && window.location.href !== `${window.location.origin}/`) {
  window.history.replaceState(window.history.state, "", "/");
}

const router = stezOnlyHost
  ? createMemoryRouter(stezOnlyRoutes, {
      initialEntries: [stezInitialRoute],
    })
  : createBrowserRouter([
      {
        path: "/",
        element: <App />,
        children: standardRoutes,
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
