import React, { FC, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import type { DAppClient } from "@airgap/beacon-dapp";

import type { SnetNetwork } from "./network";
import { waitForStezOperation } from "./rpc";
import { readableStezError } from "./transactions";
import {
  buildSnetTransfer,
  parseXtzToMutez,
  submitSnetTransfer,
  verifySnetChain,
} from "./transfer";

type TransferStep =
  | "edit"
  | "review"
  | "requesting"
  | "submitted"
  | "confirmed"
  | "failed";

interface SnetTransferDialogProps {
  open: boolean;
  network: SnetNetwork;
  connected: boolean;
  address: string | null;
  balanceMutez: bigint | null;
  client: DAppClient | null;
  onClose: () => void;
  onConnect: () => Promise<void>;
  onConfirmed: () => Promise<void>;
}

const shortValue = (value: string, front = 9, back = 7) =>
  value.length > front + back + 1
    ? `${value.slice(0, front)}…${value.slice(-back)}`
    : value;

const formatMutez = (value: bigint | null) => {
  if (value === null) return "—";
  const whole = value / BigInt(1_000_000);
  const fraction = (value % BigInt(1_000_000))
    .toString()
    .padStart(6, "0")
    .replace(/0+$/, "");
  return `${whole.toLocaleString("en-US")}${fraction ? `.${fraction}` : ".0"}`;
};

export const SnetTransferDialog: FC<SnetTransferDialogProps> = ({
  open,
  network,
  connected,
  address,
  balanceMutez,
  client,
  onClose,
  onConnect,
  onConfirmed,
}) => {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<TransferStep>("edit");
  const [error, setError] = useState("");
  const [operationHash, setOperationHash] = useState("");
  const recipientRef = useRef<HTMLInputElement>(null);
  const amountMutez = useMemo(() => parseXtzToMutez(amount), [amount]);
  const busy = step === "requesting" || step === "submitted";

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    window.setTimeout(() => recipientRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [busy, onClose, open]);

  useEffect(() => {
    if (!open) {
      setRecipient("");
      setAmount("");
      setStep("edit");
      setError("");
      setOperationHash("");
    }
  }, [open]);

  if (!open) return null;

  const prepareReview = () => {
    if (!amountMutez) {
      setError("Enter an amount with no more than six decimal places");
      return;
    }
    try {
      buildSnetTransfer({ recipient, amountMutez, balanceMutez });
      setError("");
      setStep("review");
    } catch (nextError) {
      setError(readableStezError(nextError));
    }
  };

  const send = async () => {
    if (!client || !address || !amountMutez) return;
    setError("");
    setOperationHash("");
    setStep("requesting");

    try {
      await verifySnetChain(network.rpcUrl, network.chainId);
      const hash = await submitSnetTransfer(client, {
        recipient,
        amountMutez,
        balanceMutez,
      });
      setOperationHash(hash);
      setStep("submitted");
      await waitForStezOperation(network.rpcUrl, hash);
      await onConfirmed();
      setStep("confirmed");
    } catch (nextError) {
      setError(readableStezError(nextError));
      setStep("failed");
    }
  };

  const copyHash = async () => {
    if (operationHash) await navigator.clipboard.writeText(operationHash);
  };

  return createPortal(
    <div
      className="stez-transfer-backdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target && !busy) onClose();
      }}
    >
      <section
        className="stez-transfer-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="snet-transfer-title"
      >
        <header className="stez-transfer-dialog__head">
          <div>
            <span>SNET UTILITY</span>
            <h2 id="snet-transfer-title">Send test XTZ</h2>
          </div>
          <button
            type="button"
            aria-label="Close Snet transfer"
            onClick={onClose}
            disabled={busy}
          >
            <CloseRoundedIcon />
          </button>
        </header>

        {!connected ? (
          <div className="stez-transfer-dialog__connect">
            <p>
              Connect a wallet to Snet before preparing this test transfer.
              TEZEX never receives or stores your private key.
            </p>
            <button type="button" onClick={onConnect}>
              CONNECT WALLET TO SNET
            </button>
          </div>
        ) : step === "confirmed" ? (
          <div className="stez-transfer-success" role="status">
            <CheckCircleOutlineRoundedIcon aria-hidden="true" />
            <span>TRANSFER CONFIRMED</span>
            <h3>{amount} XTZ arrived on Snet.</h3>
            <div className="stez-transfer-success__hash">
              <code>{operationHash}</code>
              <button
                type="button"
                onClick={copyHash}
                aria-label="Copy operation hash"
              >
                <ContentCopyRoundedIcon />
              </button>
            </div>
            <p>
              Snet does not currently have a TzKT explorer. The operation hash
              is shown here for your records.
            </p>
            <button
              type="button"
              className="stez-transfer-secondary"
              onClick={onClose}
            >
              DONE
            </button>
          </div>
        ) : step === "review" || busy ? (
          <div className="stez-transfer-review">
            <span className="stez-transfer-kicker">REVIEW TRANSFER</span>
            <strong>{amount} XTZ</strong>
            <dl>
              <div>
                <dt>Network</dt>
                <dd>Snet · {shortValue(network.chainId, 8, 5)}</dd>
              </div>
              <div>
                <dt>From</dt>
                <dd title={address ?? undefined}>
                  {shortValue(address ?? "")}
                </dd>
              </div>
              <div>
                <dt>To</dt>
                <dd title={recipient}>{shortValue(recipient)}</dd>
              </div>
              <div>
                <dt>Network fee</dt>
                <dd>Calculated by AirGap</dd>
              </div>
            </dl>
            <p>
              Confirm the destination carefully. Testnet transfers cannot be
              reversed after signing.
            </p>
            {error && (
              <div className="stez-transfer-error" role="alert">
                {error}
              </div>
            )}
            <div className="stez-transfer-dialog__actions">
              <button
                type="button"
                className="stez-transfer-secondary"
                onClick={() => setStep("edit")}
                disabled={busy}
              >
                BACK
              </button>
              <button type="button" onClick={send} disabled={busy}>
                {step === "requesting"
                  ? "CONFIRM IN AIRGAP"
                  : step === "submitted"
                  ? "CONFIRMING ON SNET"
                  : `SEND ${amount} XTZ`}
              </button>
            </div>
          </div>
        ) : (
          <div className="stez-transfer-form">
            <div className="stez-transfer-network">
              <span className="stez-transfer-network__dot" aria-hidden="true" />
              <div>
                <strong>Snet</strong>
                <small>{network.chainId}</small>
              </div>
              <span>{formatMutez(balanceMutez)} XTZ</span>
            </div>
            <label htmlFor="snet-transfer-recipient">DESTINATION ADDRESS</label>
            <input
              ref={recipientRef}
              id="snet-transfer-recipient"
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              placeholder="tz1…"
              value={recipient}
              onChange={(event) => {
                setRecipient(event.target.value.trim());
                setError("");
              }}
            />
            <label htmlFor="snet-transfer-amount">AMOUNT TO SEND</label>
            <div className="stez-transfer-amount">
              <input
                id="snet-transfer-amount"
                inputMode="decimal"
                placeholder="0.0"
                value={amount}
                onChange={(event) => {
                  if (/^\d*(?:\.\d{0,6})?$/.test(event.target.value)) {
                    setAmount(event.target.value);
                    setError("");
                  }
                }}
              />
              <span>XTZ</span>
            </div>
            <small className="stez-transfer-form__note">
              Keep at least 0.1 XTZ in the wallet so AirGap can add the network
              fee.
            </small>
            {error && (
              <div className="stez-transfer-error" role="alert">
                {error}
              </div>
            )}
            <button type="button" onClick={prepareReview}>
              REVIEW TRANSFER
            </button>
          </div>
        )}
      </section>
    </div>,
    document.body
  );
};
