import React, { createContext, useCallback, useState } from "react";
import { WalletProvider } from "./wallet";
import { NetworkContext, networkDefaults } from "./network";

import { TransactingComponent } from "../types/general";
const emptyLoad = (_: TransactingComponent) => {
  null;
};

export const SessionContext = createContext<SessionInfo>({
  loadComponent: emptyLoad,
  activeComponent: null,
});

export interface SessionInfo {
  loadComponent: (comp: TransactingComponent) => void;
  activeComponent: TransactingComponent | null;
}
export interface ISession {
  children:
    | JSX.Element[]
    | JSX.Element
    | React.ReactElement
    | React.ReactElement[]
    | string;
}

export function SessionProvider(props: ISession) {
  const [activeComponent, setActiveComponent] =
    useState<TransactingComponent | null>(null);

  const loadComponent = useCallback((comp: TransactingComponent) => {
    setActiveComponent(comp);
  }, []);

  return (
    <SessionContext.Provider
      value={{
        loadComponent,
        activeComponent,
      }}
    >
      <NetworkContext.Provider value={networkDefaults}>
        <WalletProvider>{props.children}</WalletProvider>
      </NetworkContext.Provider>
    </SessionContext.Provider>
  );
}
