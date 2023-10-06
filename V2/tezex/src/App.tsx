import React, { FC, useEffect } from "react";
import "./App.css";

import { Layout } from "./components/ui/views";
import { Outlet } from "react-router-dom";
import { debounce } from "./functions/util";

export const App: FC = () => {
  const [reload, setReload] = React.useState(0);
  useEffect(() => {
    const handleResize = () => {
      //re-render app on resize
      debounce(() => setReload(reload + 1), 1500);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);
  return (
    <div className="App">
      <Layout key={reload.toString()}>
        <Outlet />
      </Layout>
    </div>
  );
};

export default App;
