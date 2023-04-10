import React, { createContext, useCallback, useState } from "react";
import { WalletProvider } from "./wallet";
import { NetworkContext, networkDefaults } from "./network";
import { Alert } from "../components/ui/elements/dialogs/Alerts";
import { TransactingComponent, CompletionRecord } from "../types/general";

export const SessionContext = createContext<SessionInfo>({
  loadComponent: (_: TransactingComponent) => {
    _;
    null;
  },
  activeComponent: null,
  setAlert: (_: CompletionRecord) => {
    _;
    null;
  },
});

export interface SessionInfo {
  loadComponent: (comp: TransactingComponent) => void;
  activeComponent: TransactingComponent | null;
  setAlert: (record: CompletionRecord, force?: boolean) => void;
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

  const [_alert, setAlert] = useState<CompletionRecord | undefined>(undefined);

  const clearAlert = useCallback(() => {
    setAlert(undefined);
  }, []);

  const setRecord = useCallback((record: CompletionRecord, force?: boolean) => {
    if (!_alert || force) setAlert(record);
  }, []);

  const loadComponent = useCallback((comp: TransactingComponent) => {
    setActiveComponent(comp);
  }, []);

  return (
    <SessionContext.Provider
      value={{
        loadComponent,
        activeComponent,
        setAlert: setRecord,
      }}
    >
      <NetworkContext.Provider value={networkDefaults}>
        <WalletProvider>{props.children}</WalletProvider>
        <Alert completionRecord={_alert} clear={clearAlert} />
      </NetworkContext.Provider>
    </SessionContext.Provider>
  );
}
