import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import { NetworkType } from "@airgap/beacon-sdk";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LockClockOutlinedIcon from "@mui/icons-material/LockClockOutlined";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";

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
const TRANSACTION_SIGNING_ENABLED = false;

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
  selectedNetwork: string,
  selectedNetworkType: NetworkType
) => {
  if (loading || !snapshot) {
    return {
      title: "Loading sTEZ data",
      description:
        "TEZEX is checking the selected network for current sTEZ protocol data.",
    };
  }
  if (snapshot.availability === "available") {
    return {
      title: `sTEZ is active on ${selectedNetwork}`,
      description: `Live sTEZ protocol data was read from block ${snapshot.blockLevel.toLocaleString(
        "en-US"
      )}. Transaction signing is not yet enabled in this interface.`,
    };
  }
  if (snapshot.availability === "disabled") {
    if (selectedNetworkType === NetworkType.MAINNET) {
      return {
        title: "sTEZ is not active on Mainnet",
        description:
          "This page is a read-only preview of the sTEZ staking flow. You can explore staking, redemption, and finalization, but Mainnet transactions are not enabled. Activation would require a future Tezos protocol upgrade.",
      };
    }
    return {
      title: `sTEZ is not active on ${selectedNetwork}`,
      description:
        "The selected network includes the sTEZ protocol code, but native sTEZ contracts are not enabled. No balances, rates, or transaction controls are shown.",
    };
  }
  if (snapshot.availability === "unsupported") {
    return {
      title: `sTEZ is not supported on ${selectedNetwork}`,
      description:
        "The selected network does not expose a compatible sTEZ implementation. No balances, rates, or transaction controls are shown.",
    };
  }
  return {
    title: "Unable to load sTEZ data",
    description:
      "TEZEX could not verify the sTEZ contract or read its current state from the selected network. No cached or estimated values have been substituted.",
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
  const copy = statusCopy(snapshot, loading, selectedNetwork, network.network);

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
    if (
      snapshot?.availability === "disabled" &&
      network.network === NetworkType.MAINNET
    ) {
      return "sTEZ NOT ACTIVE ON MAINNET";
    }
    if (
      activeAction === "Finalize" &&
      (!snapshot?.redeemedFinalizableMutez ||
        snapshot.redeemedFinalizableMutez <= ZERO)
    ) {
      return "NOTHING READY TO FINALIZE";
    }
    if (available && activeAction !== "Finalize" && inputUnits <= ZERO) {
      return "ENTER AN AMOUNT";
    }
    if (!TRANSACTION_SIGNING_ENABLED) {
      return "TRANSACTIONS NOT ENABLED IN THIS PREVIEW";
    }
    if (activeAction === "Stake") return "STAKE XTZ";
    if (activeAction === "Redeem") return "REDEEM sTEZ";
    return "FINALIZE AND CLAIM XTZ";
  };

  return (
    <main className="stez-page">
      <section className="stez-hero" aria-labelledby="stez-title">
        <div>
          <span className="stez-eyebrow">PROTOCOL-NATIVE LIQUID STAKING</span>
          <h1 id="stez-title">Stake tez, stay liquid.</h1>
          <p>
            sTEZ is Tezos’s protocol-native liquid staking token. Stake XTZ to
            receive sTEZ, a token you can hold, transfer, or use in supported
            applications while its backing XTZ earns staking rewards. The
            protocol automatically assigns the pool’s staking power across
            participating bakers, so you do not need to choose one.
          </p>
        </div>
        <div className="stez-rate-summary">
          <strong>1 sTEZ = {rate} XTZ</strong>
          <span>Current protocol redemption rate</span>
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
        {available && network.network === NetworkType.SHADOWNET && (
          <a
            className="stez-availability__faucet-link"
            href={SHADOWNET_FAUCET_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Get Shadownet test XTZ from the official faucet"
          >
            GET SHADOWNET TEST XTZ
            <ArrowOutwardRoundedIcon aria-hidden="true" />
          </a>
        )}
      </section>

      <div className="stez-workspace">
        <section
          className="stez-panel stez-workspace__position"
          aria-labelledby="stez-position-title"
        >
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
              label="sTEZ Balance"
              value={
                walletConnected
                  ? formatUnits(snapshot?.walletStezUnits ?? null)
                  : "—"
              }
              note={
                walletConnected
                  ? `≈ ${formatUnits(
                      walletUnderlying
                    )} XTZ at the current protocol rate`
                  : "Connect to view"
              }
              icon={<AccountBalanceWalletOutlinedIcon />}
            />
            <PositionCell
              label="Wallet XTZ"
              value={
                walletConnected
                  ? formatUnits(snapshot?.walletXtzMutez ?? null)
                  : "—"
              }
              note={
                walletConnected ? "Available in your wallet" : "Connect to view"
              }
              icon={<AccountBalanceWalletOutlinedIcon />}
            />
            <PositionCell
              label="Pending Redemption"
              value={
                walletConnected
                  ? formatUnits(snapshot?.redeemedFrozenMutez ?? null)
                  : "—"
              }
              note={
                walletConnected
                  ? "Frozen XTZ awaiting maturity"
                  : "Connect to view"
              }
              icon={<LockClockOutlinedIcon />}
            />
            <PositionCell
              label="Ready to Finalize"
              value={
                walletConnected
                  ? formatUnits(snapshot?.redeemedFinalizableMutez ?? null)
                  : "—"
              }
              note={
                walletConnected
                  ? "Matured XTZ ready to claim"
                  : "Connect to view"
              }
              positive={Boolean(snapshot?.redeemedFinalizableMutez)}
              icon={<CheckCircleOutlineRoundedIcon />}
            />
          </div>
        </section>

        <section
          className="stez-panel stez-workspace__action"
          aria-labelledby="stez-actions-title"
        >
          <header className="stez-panel__head stez-panel__head--actions">
            <h2 id="stez-actions-title" className="stez-sr-only">
              sTEZ actions
            </h2>
            <div
              className="stez-action-tabs"
              role="tablist"
              aria-label="sTEZ action"
            >
              {(["Stake", "Redeem", "Finalize"] as StezAction[]).map(
                (action) => (
                  <button
                    key={action}
                    type="button"
                    role="tab"
                    aria-selected={activeAction === action}
                    className={
                      activeAction === action ? "is-active" : undefined
                    }
                    onClick={() => {
                      setActiveAction(action);
                      setAmount("");
                    }}
                  >
                    {action}
                  </button>
                )
              )}
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
                    Still pending:{" "}
                    {formatUnits(snapshot?.redeemedFrozenMutez ?? null)} XTZ
                  </span>
                  <span>Finalization releases all matured redemptions</span>
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
                    <span>{activeAction === "Stake" ? "XTZ" : "sTEZ"}</span>
                  </div>
                </div>

                <ArrowDownwardRoundedIcon className="stez-conversion-arrow" />

                <div className="stez-amount-field">
                  <span className="stez-field-label">
                    {activeAction === "Stake"
                      ? "YOU RECEIVE"
                      : "XTZ ENTERING REDEMPTION"}
                  </span>
                  <div className="stez-amount-field__value">
                    <strong>{formatUnits(quotedOutput)}</strong>
                    <span>{activeAction === "Stake" ? "sTEZ" : "XTZ"}</span>
                  </div>
                </div>
                <div className="stez-action-meta">
                  {activeAction === "Stake" ? (
                    <>
                      <span>Rate: {rate} XTZ per sTEZ</span>
                      <span>
                        Final amount is determined when the operation is
                        included on-chain
                      </span>
                    </>
                  ) : (
                    <>
                      <span>Quoted at the current protocol rate</span>
                      <span>
                        Final XTZ may change if slashing occurs before
                        finalization
                      </span>
                    </>
                  )}
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
                  Staking XTZ mints sTEZ at the current protocol rate. The
                  protocol automatically assigns the pool’s staking power across
                  participating bakers, so you do not need to choose one. Your
                  sTEZ remains transferable while the backing XTZ earns staking
                  rewards.
                </p>
              )}
              {activeAction === "Redeem" && (
                <p>
                  Redeeming burns sTEZ and begins a delayed withdrawal of the
                  corresponding XTZ. The XTZ remains frozen and slashable until
                  the redemption delay ends, then must be finalized before it
                  returns to your wallet.
                </p>
              )}
              {activeAction === "Finalize" && (
                <p>
                  After the redemption delay has elapsed, finalization releases
                  all matured XTZ to the original redeemer. Anyone may submit
                  the operation, but the funds can only be sent to that
                  redeemer.
                </p>
              )}
            </div>
          </div>
        </section>

        <section
          className="stez-panel stez-workspace__rate"
          aria-labelledby="stez-rate-history-title"
        >
          <header className="stez-panel__head">
            <h2 id="stez-rate-history-title">PROTOCOL RATE</h2>
            <span>
              Block {snapshot?.blockLevel.toLocaleString("en-US") ?? "—"}
            </span>
          </header>
          <div className="stez-rate-panel">
            <div>
              <span className="stez-field-label">CURRENT REDEMPTION RATE</span>
              <strong>
                <span>1 sTEZ =</span>
                <span>{rate} XTZ</span>
              </strong>
              <small>
                Rewards do not increase your sTEZ balance. Instead, they
                increase the amount of XTZ each sTEZ can redeem for. Baker fees
                reduce the rewards passed through, and slashing can lower the
                redemption rate.
              </small>
            </div>
            <div className="stez-rate-panel__empty">
              <p>
                Rate history will appear once TEZEX is indexing a live
                sTEZ-enabled network. No simulated returns or projected APY are
                shown.
              </p>
            </div>
          </div>
        </section>

        <details className="stez-protocol-details stez-workspace__details">
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
              <dt>Total sTEZ supply</dt>
              <dd>{formatUnits(snapshot?.totalSupplyUnits ?? null)}</dd>
              <dt>Total XTZ backing</dt>
              <dd>{formatUnits(snapshot?.totalBackingMutez ?? null)}</dd>
            </dl>
            <p>
              All values are read directly from the selected Tezos network at
              the displayed block. TEZEX does not substitute cached rates,
              guessed values, or hardcoded contract data when sTEZ cannot be
              verified.
            </p>
          </div>
        </details>
      </div>
    </main>
  );
};

export default Stez;
