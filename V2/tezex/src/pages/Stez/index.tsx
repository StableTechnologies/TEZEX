import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import { NetworkType } from "@airgap/beacon-sdk";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LockClockOutlinedIcon from "@mui/icons-material/LockClockOutlined";

import connectWallet from "../../functions/beacon";
import { useNetwork } from "../../hooks/network";
import { useWallet } from "../../hooks/wallet";
import {
  loadStezSnapshot,
  quoteStezDeposit,
  quoteStezRedeem,
  StezSnapshot,
  stezUnderlyingValue,
} from "./rpc";
import "./style.css";

type StezAction = "Stake" | "Redeem" | "Finalize";

const ZERO = BigInt(0);
const TOKEN_SCALE = BigInt(1_000_000);
const SHADOWNET_FAUCET_URL = "https://faucet.shadownet.teztnets.com";

const networkName = (network: NetworkType) => {
  if (network === NetworkType.MAINNET) return "Mainnet";
  if (network === NetworkType.SHADOWNET) return "Shadownet";
  return "Previewnet";
};

const shortAddress = (value?: string | null, front = 7, back = 5) => {
  if (!value) return "";
  return value.length > front + back + 1
    ? `${value.slice(0, front)}…${value.slice(-back)}`
    : value;
};

const formatUnits = (value: bigint | null, maximumDecimals = 6) => {
  if (value === null) return "—";
  const sign = value < ZERO ? "-" : "";
  const absolute = value < ZERO ? -value : value;
  const whole = absolute / TOKEN_SCALE;
  const fraction = (absolute % TOKEN_SCALE)
    .toString()
    .padStart(6, "0")
    .slice(0, maximumDecimals)
    .replace(/0+$/, "");
  return `${sign}${whole.toLocaleString("en-US")}${
    fraction ? `.${fraction}` : ".0"
  }`;
};

const parseUnits = (value: string) => {
  if (!value || !/^\d*(?:\.\d{0,6})?$/.test(value)) return ZERO;
  const [whole = "0", fraction = ""] = value.split(".");
  return (
    BigInt(whole || "0") * TOKEN_SCALE +
    BigInt((fraction + "000000").slice(0, 6))
  );
};

const formatRatio = (numerator: bigint | null, denominator: bigint | null) => {
  if (!numerator || !denominator) return "—";
  const precision = TOKEN_SCALE;
  const scaled = (numerator * precision) / denominator;
  return formatUnits(scaled, 6);
};

const statusCopy = (
  snapshot: StezSnapshot | null,
  loading: boolean,
  selectedNetwork: string
) => {
  if (loading || !snapshot) {
    return {
      title: "Checking sTEZ availability",
      description:
        "TEZEX is resolving one fixed Tezos block and checking the native sTEZ capability.",
    };
  }
  if (snapshot.availability === "available") {
    return {
      title: `sTEZ is available on ${selectedNetwork}`,
      description: snapshot.detail,
    };
  }
  if (snapshot.availability === "disabled") {
    return {
      title: `sTEZ is not enabled on ${selectedNetwork}`,
      description:
        "The Ushuaia upgrade introduced protocol-native sTEZ for testnet experimentation. Mainnet has not activated it. On a testnet where sTEZ is enabled, use this interface to see how staking, redemption, and finalization work.",
    };
  }
  if (snapshot.availability === "unsupported") {
    return {
      title: `sTEZ is unavailable on ${selectedNetwork}`,
      description: snapshot.detail,
    };
  }
  return {
    title: `Could not verify sTEZ on ${selectedNetwork}`,
    description: snapshot.detail,
  };
};

interface PositionCellProps {
  label: string;
  value: string;
  note: string;
  positive?: boolean;
  icon: React.ReactNode;
}

const PositionCell: FC<PositionCellProps> = ({
  label,
  value,
  note,
  positive,
  icon,
}) => (
  <div className="stez-position-cell">
    <div className="stez-position-cell__label">
      <span aria-hidden="true">{icon}</span>
      {label}
    </div>
    <strong className={positive ? "is-positive" : undefined}>{value}</strong>
    <small>{note}</small>
  </div>
);

export const Stez: FC = () => {
  const network = useNetwork();
  const wallet = useWallet();
  const selectedNetwork = networkName(network.network);
  const [snapshot, setSnapshot] = useState<StezSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<StezAction>("Stake");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setSnapshot(null);
    setAmount("");

    loadStezSnapshot(network.info, wallet.address, controller.signal)
      .then((nextSnapshot) => {
        if (!controller.signal.aborted) setSnapshot(nextSnapshot);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          console.error("Unable to load sTEZ state", error);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [network.info, network.network, wallet.address]);

  const available = snapshot?.availability === "available";
  const walletConnected = wallet.isWalletConnected && Boolean(wallet.address);
  const rate = formatRatio(
    snapshot?.rateNumeratorMutez ?? null,
    snapshot?.rateDenominatorTokenUnits ?? null
  );
  const walletUnderlying =
    available &&
    snapshot.walletStezUnits !== null &&
    snapshot.rateNumeratorMutez &&
    snapshot.rateDenominatorTokenUnits
      ? stezUnderlyingValue(
          snapshot.walletStezUnits,
          snapshot.rateNumeratorMutez,
          snapshot.rateDenominatorTokenUnits
        )
      : null;
  const inputUnits = parseUnits(amount);
  const quotedOutput = useMemo(() => {
    if (
      !available ||
      inputUnits <= ZERO ||
      !snapshot?.rateNumeratorMutez ||
      !snapshot.rateDenominatorTokenUnits ||
      activeAction === "Finalize"
    ) {
      return null;
    }
    return activeAction === "Stake"
      ? quoteStezDeposit(
          inputUnits,
          snapshot.rateNumeratorMutez,
          snapshot.rateDenominatorTokenUnits
        )
      : quoteStezRedeem(
          inputUnits,
          snapshot.rateNumeratorMutez,
          snapshot.rateDenominatorTokenUnits
        );
  }, [activeAction, available, inputUnits, snapshot]);
  const copy = statusCopy(snapshot, loading, selectedNetwork);

  const connect = useCallback(async () => {
    await connectWallet(wallet, network);
  }, [network, wallet]);

  const setMaximum = () => {
    const maximum =
      activeAction === "Stake"
        ? snapshot?.walletXtzMutez
        : snapshot?.walletStezUnits;
    if (maximum !== null && maximum !== undefined) {
      setAmount(formatUnits(maximum).replace(/,/g, ""));
    }
  };

  const actionButtonCopy = () => {
    if (!walletConnected) return "CONNECT WALLET";
    if (!available) return `NOT ENABLED ON ${selectedNetwork.toUpperCase()}`;
    if (activeAction === "Finalize") {
      return snapshot?.redeemedFinalizableMutez
        ? "FINALIZE AND CLAIM XTZ"
        : "NOTHING READY TO FINALIZE";
    }
    if (inputUnits <= ZERO) return "ENTER AN AMOUNT";
    return "TRANSACTION SIGNING AWAITS SANDBOX VALIDATION";
  };

  return (
    <main className="stez-page">
      <section className="stez-hero" aria-labelledby="stez-title">
        <div>
          <span className="stez-eyebrow">PROTOCOL-NATIVE LIQUID STAKING</span>
          <h1 id="stez-title">Stake tez, stay liquid.</h1>
          <p>
            sTEZ is a non-rebasing share of tez staked by the Tezos protocol.
            Its redemption value changes with rewards, fees, and slashing.
          </p>
        </div>
        <div className="stez-rate-summary">
          <strong>{loading ? "…" : rate}</strong>
          <span>XTZ per sTez · protocol rate</span>
        </div>
      </section>

      <section
        className={`stez-availability is-${
          loading ? "checking" : snapshot?.availability ?? "unreachable"
        }`}
        aria-live="polite"
      >
        <span className="stez-availability__signal" aria-hidden="true" />
        <div>
          <strong>{copy.title}</strong>
          <p>{copy.description}</p>
        </div>
        <a
          className="stez-availability__faucet-link"
          href={SHADOWNET_FAUCET_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="Get Shadownet test XTZ from the official faucet"
        >
          GET SHADOWNET TEST XTZ <span aria-hidden="true">↗</span>
        </a>
      </section>

      <section className="stez-panel" aria-labelledby="stez-position-title">
        <header className="stez-panel__head">
          <h2 id="stez-position-title">YOUR POSITION</h2>
          <span>
            {walletConnected
              ? shortAddress(wallet.address)
              : "Wallet not connected"}
          </span>
        </header>
        <div className="stez-position-grid">
          <PositionCell
            label="Liquid sTez"
            value={
              walletConnected
                ? formatUnits(snapshot?.walletStezUnits ?? null)
                : "—"
            }
            note={
              walletConnected
                ? `≈ ${formatUnits(walletUnderlying)} XTZ`
                : "Connect to view"
            }
            icon={<AccountBalanceWalletOutlinedIcon />}
          />
          <PositionCell
            label="Available"
            value={
              walletConnected
                ? formatUnits(snapshot?.walletXtzMutez ?? null)
                : "—"
            }
            note="XTZ in wallet"
            icon={<AccountBalanceWalletOutlinedIcon />}
          />
          <PositionCell
            label="Unbonding"
            value={
              walletConnected
                ? formatUnits(snapshot?.redeemedFrozenMutez ?? null)
                : "—"
            }
            note="XTZ · delay not elapsed"
            icon={<LockClockOutlinedIcon />}
          />
          <PositionCell
            label="Ready to finalize"
            value={
              walletConnected
                ? formatUnits(snapshot?.redeemedFinalizableMutez ?? null)
                : "—"
            }
            note="XTZ · finalizable now"
            positive={Boolean(snapshot?.redeemedFinalizableMutez)}
            icon={<CheckCircleOutlineRoundedIcon />}
          />
        </div>
      </section>

      <section className="stez-panel" aria-labelledby="stez-actions-title">
        <header className="stez-panel__head stez-panel__head--actions">
          <h2 id="stez-actions-title" className="stez-sr-only">
            sTEZ actions
          </h2>
          <div
            className="stez-action-tabs"
            role="tablist"
            aria-label="sTEZ action"
          >
            {(["Stake", "Redeem", "Finalize"] as StezAction[]).map((action) => (
              <button
                key={action}
                type="button"
                role="tab"
                aria-selected={activeAction === action}
                className={activeAction === action ? "is-active" : undefined}
                onClick={() => {
                  setActiveAction(action);
                  setAmount("");
                }}
              >
                {action}
              </button>
            ))}
          </div>
          <span>
            {selectedNetwork}
            {snapshot?.blockLevel
              ? ` · block ${snapshot.blockLevel.toLocaleString("en-US")}`
              : ""}
          </span>
        </header>

        <div className="stez-action-body" role="tabpanel">
          {activeAction === "Finalize" ? (
            <>
              <div className="stez-amount-field">
                <span className="stez-field-label">READY TO FINALIZE</span>
                <div className="stez-amount-field__value">
                  <strong>
                    {formatUnits(snapshot?.redeemedFinalizableMutez ?? null)}
                  </strong>
                  <span>XTZ</span>
                </div>
              </div>
              <div className="stez-action-meta">
                <span>
                  Still unbonding:{" "}
                  {formatUnits(snapshot?.redeemedFrozenMutez ?? null)} XTZ
                </span>
                <span>Finalization releases every matured redemption</span>
              </div>
            </>
          ) : (
            <>
              <div className="stez-amount-field">
                <div className="stez-amount-field__topline">
                  <label htmlFor="stez-action-amount">
                    {activeAction === "Stake" ? "YOU STAKE" : "YOU REDEEM"}
                  </label>
                  <button
                    type="button"
                    onClick={setMaximum}
                    disabled={!walletConnected || !available}
                  >
                    MAX{" "}
                    {formatUnits(
                      activeAction === "Stake"
                        ? snapshot?.walletXtzMutez ?? null
                        : snapshot?.walletStezUnits ?? null
                    )}
                  </button>
                </div>
                <div className="stez-amount-field__input">
                  <input
                    id="stez-action-amount"
                    inputMode="decimal"
                    placeholder="0.0"
                    value={amount}
                    disabled={!available}
                    onChange={(event) => {
                      if (/^\d*(?:\.\d{0,6})?$/.test(event.target.value)) {
                        setAmount(event.target.value);
                      }
                    }}
                  />
                  <span>{activeAction === "Stake" ? "XTZ" : "sTez"}</span>
                </div>
              </div>

              <ArrowDownwardRoundedIcon className="stez-conversion-arrow" />

              <div className="stez-amount-field">
                <span className="stez-field-label">
                  {activeAction === "Stake"
                    ? "YOU RECEIVE"
                    : "REDEMPTION VALUE"}
                </span>
                <div className="stez-amount-field__value">
                  <strong>{formatUnits(quotedOutput)}</strong>
                  <span>{activeAction === "Stake" ? "sTez" : "XTZ"}</span>
                </div>
              </div>
              <div className="stez-action-meta">
                <span>Rate {rate} · fixed block quote</span>
                <span>
                  Exact result is determined when the operation is included
                </span>
              </div>
            </>
          )}

          <button
            type="button"
            className="stez-primary-action"
            disabled={walletConnected}
            onClick={walletConnected ? undefined : connect}
          >
            {actionButtonCopy()}
          </button>

          <div className="stez-action-explanation">
            <InfoOutlinedIcon aria-hidden="true" />
            {activeAction === "Stake" && (
              <p>
                Depositing XTZ mints sTez to the sender. sTez is non-rebasing:
                your token count changes only when you deposit, redeem,
                transfer, or receive tokens; protocol performance changes its
                XTZ value.
              </p>
            )}
            {activeAction === "Redeem" && (
              <p>
                Redeeming burns sTez and moves the XTZ value into the protocol’s
                frozen redemption ledger. This is not an instant withdrawal.
              </p>
            )}
            {activeAction === "Finalize" && (
              <p>
                After the protocol delay, a separate finalization operation
                releases matured XTZ to the original redeemer. Anyone may submit
                it, but the funds always go to that redeemer.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="stez-panel" aria-labelledby="stez-rate-history-title">
        <header className="stez-panel__head">
          <h2 id="stez-rate-history-title">PROTOCOL RATE</h2>
          <span>Fixed-block RPC data</span>
        </header>
        <div className="stez-rate-panel">
          <div>
            <span className="stez-field-label">CURRENT REDEMPTION RATE</span>
            <strong>{rate}</strong>
            <small>XTZ per sTez</small>
          </div>
          <div className="stez-rate-panel__empty">
            <p>
              Historical rate data will appear after TEZEX begins indexing an
              enabled network. No simulated history or projected APY is shown.
            </p>
          </div>
        </div>
      </section>

      <details className="stez-protocol-details">
        <summary>PROTOCOL DETAILS</summary>
        <div>
          <dl>
            <dt>Network / chain ID</dt>
            <dd>
              {selectedNetwork} ·{" "}
              {shortAddress(snapshot?.chainId || network.info.chainId, 10, 6)}
            </dd>
            <dt>Protocol</dt>
            <dd>
              {shortAddress(snapshot?.protocolHash, 12, 8) || "Not resolved"}
            </dd>
            <dt>Native contract</dt>
            <dd>
              {shortAddress(snapshot?.contractHash, 10, 8) ||
                "Not created on this network"}
            </dd>
            <dt>Snapshot block</dt>
            <dd>
              {snapshot?.blockLevel
                ? snapshot.blockLevel.toLocaleString("en-US")
                : "Not resolved"}
            </dd>
            <dt>Total sTez supply</dt>
            <dd>{formatUnits(snapshot?.totalSupplyUnits ?? null)}</dd>
            <dt>Total XTZ backing</dt>
            <dd>{formatUnits(snapshot?.totalBackingMutez ?? null)}</dd>
          </dl>
          <p>
            TEZEX discovers the native contract from the selected chain and
            reads all values from one resolved block. It never substitutes a
            testnet contract address or a cached rate when capability detection
            fails.
          </p>
        </div>
      </details>
    </main>
  );
};

export default Stez;
