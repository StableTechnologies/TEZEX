import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import { ThemeProvider } from '@mui/material';
import theme from './theme';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { SessionProvider } from './contexts/session';
ReactDOM.render(
  <React.StrictMode>
    <SessionProvider>
    <ThemeProvider theme={theme}>
        <App />
    </ThemeProvider>
    </SessionProvider>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
