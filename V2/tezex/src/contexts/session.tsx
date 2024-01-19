import React, { createContext, useCallback, useState } from "react";
import { WalletProvider } from "./wallet";
import { NetworkContext, networkDefaults } from "./network";
import { Alert } from "../components/ui/elements/dialogs/Alerts";
import {
  AppConfig,
  TransactingComponent,
  CompletionRecord,
  Pages,
} from "../types/general";
import { showAlert } from "../functions/util";
import appConfig from "../config/app.json";
import { useNavigate } from "react-router-dom";

export const SessionContext = createContext<SessionInfo>({
  loadComponent: (_: TransactingComponent) => {
    _;
    null;
  },
  activeComponent: null,
  navigate: (_: Pages) => {
    _;
    null;
  },
  isPageActive: (_: Pages): boolean => {
    _;
    return false;
  },
  setAlert: (_: CompletionRecord | undefined) => {
    _;
    null;
  },
  appConfig: appConfig as AppConfig,
});

export interface SessionInfo {
  loadComponent: (comp: TransactingComponent) => void;
  activeComponent: TransactingComponent | null;
  navigate: (page: Pages) => void;
  isPageActive: (page: Pages) => boolean;
  setAlert: (record: CompletionRecord | undefined, force?: boolean) => void;
  appConfig: AppConfig;
}
export interface ISession {
  config: AppConfig;
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

  const [activePage, setActivePage] = useState<Pages>(Pages.HOME);

  const isPageActive = useCallback((page: Pages) => {
    if (page === Pages.HOME || page === activePage) {
      return true;
    }
    return false;
  }, []);
  const clearAlert = useCallback(() => {
    setAlert(undefined);
  }, []);

  const setRecord = useCallback(
    (record: CompletionRecord | undefined, force?: boolean) => {
      if (!_alert || force) setAlert(record);
    },
    []
  );

  const loadComponent = useCallback((comp: TransactingComponent) => {
    setActiveComponent(comp);
    switch (comp) {
      case TransactingComponent.SWAP:
        setActivePage(Pages.SWAP);
        break;
      case TransactingComponent.ADD_LIQUIDITY:
        setActivePage(Pages.ADD_LIQUIDITY);
        break;
      case TransactingComponent.REMOVE_LIQUIDITY:
        setActivePage(Pages.REMOVE_LIQUIDITY);
        break;
    }
  }, []);

  const navigate = useCallback((page: Pages) => {
    const nav = useNavigate();
    if (page === Pages.ABOUT) {
      window.open(appConfig.aboutRedirectUrl, "_blank");
    } else {
      setActivePage(page);
      nav(page);
    }
  }, []);

  return (
    <SessionContext.Provider
      value={{
        loadComponent,
        activeComponent,
        navigate,
        isPageActive,
        setAlert: setRecord,
        appConfig: props.config,
      }}
    >
      <NetworkContext.Provider value={networkDefaults}>
        <WalletProvider>{props.children}</WalletProvider>
        <Alert completionRecord={showAlert(_alert)} clear={clearAlert} />
      </NetworkContext.Provider>
    </SessionContext.Provider>
  );
}
