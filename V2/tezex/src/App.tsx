import React, { FC } from "react";
import './App.css';

import {Wallet} from './components/wallet/Wallet';
import { Layout } from "./components/ui/views/Layout";

export const App: FC = () => {
  return (
    <div className="App">
      <header className="App-header">
        <p>
		<Layout>
			Main window
		</Layout>
        </p>
      </header>

    </div>
  );
}

export default App;
