import React, { useEffect, useState } from "react";
import { prepareWalletStorage } from "../../functions/walletStorage";

export function WalletStorageGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    prepareWalletStorage().then(
      () => mounted && setReady(true),
      () => mounted && setFailed(true)
    );
    return () => {
      mounted = false;
    };
  }, []);

  if (ready) return <>{children}</>;

  return (
    <main style={{ margin: "15vh auto", maxWidth: 480, padding: 24 }}>
      <h1>TEZEX</h1>
      {failed ? (
        <div role="alert">
          <p>Your wallet connection needs a refresh.</p>
          <p>
            Close other TEZEX tabs, then reload this page in an updated browser
            with site storage enabled. You may need to connect your wallet
            again.
          </p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload TEZEX
          </button>
        </div>
      ) : (
        <p role="status">Preparing your wallet connection…</p>
      )}
    </main>
  );
}
