import React, { FC, useEffect, useState } from "react";
import "./App.css";

import { Layout } from "./components/ui/views";
import { Outlet } from "react-router-dom";
import { useMobileOrientation } from "react-device-detect";

export const App: FC = () => {
  const { isLandscape } = useMobileOrientation();
  // State to trigger re-render
  const [orientation, setOrientation] = useState(screen.orientation.type);

  useEffect(() => {
    // Handler to set new orientation
    const handleOrientationChange = () => {
      setOrientation(screen.orientation.type);
    };

    // Add event listener
    screen.orientation.addEventListener("change", handleOrientationChange);

    // Cleanup
    return () => {
      screen.orientation.removeEventListener("change", handleOrientationChange);
    };
  }, []);

  return (
    <div className="App">
      <Layout isLandScape={isLandscape} orientation={orientation}>
        <Outlet />
      </Layout>
    </div>
  );
};

export default App;
