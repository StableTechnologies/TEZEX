import React from 'react';
import logo from './logo.svg';
import './App.css';

import {Wallet} from './components/session/wallet';

function App() {
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
