import React, { FC } from "react";
import './App.css';

import {Wallet} from './components/wallet/Wallet';

export const App: FC = () => {
  return (
    <div className="App">
      <header className="App-header">
        <p>
      <Wallet />
        </p>
      </header>

    </div>
  );
}

export default App;
