import React, { FC } from "react";
import './App.css';

import { Layout } from "./components/ui/views/Layout";
import { SwapToken } from "./components/liquidityBaking/swapToken/SwapToken";

export const App: FC = () => {
  return (
    <div className="App">
      <header className="App-header">
        <p>
		<Layout>
			<SwapToken />	
		</Layout>
        </p>
      </header>

    </div>
  );
}

export default App;
