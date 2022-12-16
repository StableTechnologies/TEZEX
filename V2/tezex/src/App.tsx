import React, { FC } from "react";
import './App.css';

import { Layout } from "./components/ui/views/Layout";
import { Swap } from "./pages/swap";
import { AddLiquidity } from "./pages/addLiquidity";
import { RemoveLiquidity } from "./pages/removeLiquidity";

export const App: FC = () => {
  return (
    <div className="App">
      <header className="App-header">
        <p>
		<Layout>
			<RemoveLiquidity/>
			<Swap/>	
			<AddLiquidity/>	
		</Layout>
        </p>
      </header>

    </div>
  );
}

export default App;
