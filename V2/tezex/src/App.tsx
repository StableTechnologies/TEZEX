import React, { FC } from "react";
import './App.css';

import { Layout } from "./components/ui/views/Layout";
import { Swap } from "./pages/swap";

export const App: FC = () => {
  return (
    <div className="App">
      <header className="App-header">
        <p>
		<Layout>
			<Swap/>	
		</Layout>
        </p>
      </header>

    </div>
  );
}

export default App;
