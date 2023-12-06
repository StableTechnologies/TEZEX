import React, { FC } from "react";
import "./App.css";

import { Layout } from "./components/ui/views";
import { Outlet } from "react-router-dom";
import { useMobileOrientation } from "react-device-detect";

export const App: FC = () => {
  const { isLandscape } = useMobileOrientation();
  return (
    <div className="App">
      <Layout isLandScape={isLandscape}>
        <Outlet />
      </Layout>
    </div>
  );
};

export default App;
