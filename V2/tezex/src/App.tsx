import React, { FC } from "react";
import './App.css';

import { Layout } from "./components/ui/views/Layout";
import { Swap } from "./pages/swap";
import { AddLiquidity } from "./pages/addLiquidity";

export const App: FC = () => {
  return (
    <div className="App">
      <header className="App-header">
        <p>
		<Layout>
			<Swap/>	
			<AddLiquidity/>	
		</Layout>
        </p>
      </header>

    </div>
  );
}

export default App;
