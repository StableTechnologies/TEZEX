import React, { createContext, useState } from 'react';

const baseState = {
  ethereumClient: {},
  tezosClient: {},
};

const initialState = { ...baseState };

export const TezexContext = createContext({});
TezexContext.displayName = 'TezexContext';

export default props => {
  const [settings, setSettings] = useState(initialState);

  const changeEthereumClient = (ethereumClient) => {
    setSettings({ ...settings, ethereumClient });
  };

  const changeTezosClient = (tezosClient) => {
    setSettings({ ...settings, tezosClient });
  };

  const actions = {
    changeEthereumClient,
    changeTezosClient
  };

  const value = {
    ...settings,
    ...actions
  };

  return <TezexContext.Provider value={value}>{props.children}</TezexContext.Provider>;
};