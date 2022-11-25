import React, { FC } from "react";
import './App.css';

import { Layout } from "./components/ui/views/Layout";
import { SwapXTZToToken } from "./components/liquidityBaking/swapXTZToToken";

export const App: FC = () => {
  return (
    <div className="App">
      <header className="App-header">
        <p>
		<Layout>
			<SwapXTZToToken />	
		</Layout>
        </p>
      </header>

    </div>
  );
}

export default App;
