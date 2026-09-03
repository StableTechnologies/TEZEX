import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import React, { FC, FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface SnetFaucetDrawerProps {
  open: boolean;
  apiUrl: string;
  initialAddress?: string | null;
  onClose: () => void;
}

type FaucetPhase = "idle" | "submitting" | "success" | "error";

const MIN_AMOUNT = 100;
const MAX_AMOUNT = 10_000;
const DEFAULT_AMOUNT = 1_000;
const STEP = 100;
const TEZOS_ADDRESS = /^(tz1|tz2|tz3)[1-9A-HJ-NP-Za-km-z]{33}$/;

export const SnetFaucetDrawer: FC<SnetFaucetDrawerProps> = ({
  open,
  apiUrl,
  initialAddress,
  onClose,
}) => {
  const [address, setAddress] = useState(initialAddress ?? "");
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [phase, setPhase] = useState<FaucetPhase>("idle");
  const [message, setMessage] = useState("");
  const [operationHash, setOperationHash] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAddress(initialAddress ?? "");
    setAmount(DEFAULT_AMOUNT);
    setPhase("idle");
    setMessage("");
    setOperationHash("");
    setCopied(false);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [initialAddress, onClose, open]);

  if (!open) return null;

  const validAddress = TEZOS_ADDRESS.test(address.trim());
  const available = Boolean(apiUrl);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!available) {
      setPhase("error");
      setMessage("The Snet faucet is temporarily unavailable.");
      return;
    }
    if (!validAddress) {
      setPhase("error");
      setMessage("Enter a valid Tezos wallet address.");
      return;
    }

    setPhase("submitting");
    setMessage("");
    try {
      const response = await fetch(`${apiUrl}/api/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: address.trim(),
          network: "snet",
          token: "xtz",
          amount,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          payload?.error ?? payload?.message ?? "The faucet request failed."
        );
      }
      setOperationHash(payload.txHash ?? payload.operationHash ?? "");
      setPhase("success");
    } catch (error) {
      setPhase("error");
      setMessage(
        error instanceof Error ? error.message : "The faucet request failed."
      );
    }
  };

  const copyHash = async () => {
    if (!operationHash) return;
    await navigator.clipboard.writeText(operationHash);
    setCopied(true);
  };

  return createPortal(
    <div
      className="stez-faucet-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        className="stez-faucet-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stez-faucet-title"
      >
        <header className="stez-faucet-drawer__head">
          <div>
            <span>SNET FAUCET</span>
            <h2 id="stez-faucet-title">Get test XTZ</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close faucet">
            <CloseRoundedIcon aria-hidden="true" />
          </button>
        </header>

        {phase === "success" ? (
          <div className="stez-faucet-success" aria-live="polite">
            <CheckCircleOutlineRoundedIcon aria-hidden="true" />
            <span>TEST XTZ SENT</span>
            <h3>{amount.toLocaleString()} XTZ was sent on Snet.</h3>
            {operationHash && (
              <div className="stez-faucet-success__hash">
                <code>{operationHash}</code>
                <button type="button" onClick={copyHash} aria-label="Copy operation hash">
                  <ContentCopyRoundedIcon aria-hidden="true" />
                </button>
              </div>
            )}
            {copied && <small>Operation hash copied.</small>}
            <button type="button" className="stez-faucet-success__done" onClick={onClose}>
              DONE
            </button>
          </div>
        ) : (
          <form className="stez-faucet-form" onSubmit={submit}>
            <label htmlFor="stez-faucet-address">DESTINATION ADDRESS</label>
            <input
              id="stez-faucet-address"
              value={address}
              onChange={(event) => {
                setAddress(event.target.value);
                if (phase === "error") setPhase("idle");
              }}
              placeholder="tz1..."
              autoComplete="off"
              spellCheck={false}
            />

            <div className="stez-faucet-form__amount-head">
              <label htmlFor="stez-faucet-amount">AMOUNT</label>
              <output htmlFor="stez-faucet-amount">
                {amount.toLocaleString()} XTZ
              </output>
            </div>
            <input
              id="stez-faucet-amount"
              className="stez-faucet-form__range"
              type="range"
              min={MIN_AMOUNT}
              max={MAX_AMOUNT}
              step={STEP}
              value={amount}
              aria-label="Faucet amount"
              onChange={(event) => setAmount(Number(event.target.value))}
              style={{
                "--stez-faucet-progress": `${
                  ((amount - MIN_AMOUNT) / (MAX_AMOUNT - MIN_AMOUNT)) * 100
                }%`,
              } as React.CSSProperties}
            />
            <div className="stez-faucet-form__range-labels" aria-hidden="true">
              <span>{MIN_AMOUNT.toLocaleString()}</span>
              <span>{MAX_AMOUNT.toLocaleString()} XTZ MAX</span>
            </div>

            <p>
              Test XTZ has no monetary value. One request per wallet every 24
              hours.
            </p>
            {phase === "error" && (
              <div className="stez-faucet-form__error" role="alert">
                {message}
              </div>
            )}
            <button
              type="submit"
              className="stez-faucet-form__submit"
              disabled={phase === "submitting"}
            >
              {phase === "submitting"
                ? "SENDING…"
                : `SEND ${amount.toLocaleString()} XTZ`}
            </button>
          </form>
        )}
      </aside>
    </div>,
    document.body
  );
};
