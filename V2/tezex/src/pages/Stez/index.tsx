import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LockClockOutlinedIcon from "@mui/icons-material/LockClockOutlined";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";

import { connectWalletToCustomNetwork } from "../../functions/beacon";
import { useWallet } from "../../hooks/wallet";
import {
  loadStezSnapshot,
  quoteStezDeposit,
  quoteStezRedeem,
  StezSnapshot,
  stezUnderlyingValue,
  waitForStezOperation,
} from "./rpc";
import { isSnetAccount, resolveSnet, SnetNetwork } from "./network";
import { readableStezError, submitStezOperation } from "./transactions";
import "./style.css";

type StezAction = "Stake" | "Redeem" | "Finalize";

const ZERO = BigInt(0);
const TOKEN_SCALE = BigInt(1_000_000);
export const STEZ_REFRESH_INTERVAL_MS = 15_000;

type TransactionStage =
  | "idle"
  | "requesting"
  | "submitted"
  | "confirmed"
  | "failed";

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
  networkError: string | null,
  hasTestXtz: boolean
) => {
  if (loading) {
    return {
      title: "Loading sTEZ data",
      description:
        "TEZEX is connecting to Snet and checking its native sTEZ contract.",
    };
  }
  if (!snapshot) {
    return {
      title: "Unable to reach Snet",
      description:
        networkError ??
        "The Snet public RPC could not be reached. No cached or estimated values have been substituted.",
    };
  }
  if (snapshot.availability === "available") {
    return {
      title: `sTEZ is live on ${selectedNetwork}`,
      description: hasTestXtz
        ? `Test XTZ detected in your connected wallet. You can use it to stake, redeem, and finalize against the current experimental protocol. If you need more for testing, use the Snet faucet below. Live data was read from block ${snapshot.blockLevel.toLocaleString(
            "en-US"
          )}. Snet is intended for longer-term sTEZ testing without Weeklynet’s scheduled resets.`
        : `Use test XTZ to stake, redeem, and finalize against the current experimental protocol. Live data was read from block ${snapshot.blockLevel.toLocaleString(
            "en-US"
          )}. Snet is intended for longer-term sTEZ testing without Weeklynet’s scheduled resets.`,
    };
  }
  if (snapshot.availability === "disabled") {
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
  wide?: boolean;
  rightDivider?: boolean;
  finalRow?: boolean;
  icon: React.ReactNode;
}

const PositionCell: FC<PositionCellProps> = ({
  label,
  value,
  note,
  positive,
  wide,
  rightDivider,
  finalRow,
  icon,
}) => (
  <div
    className={[
      "stez-position-cell",
      wide ? "is-wide" : "",
      rightDivider ? "has-right-divider" : "",
      finalRow ? "is-final-row" : "",
    ]
      .filter(Boolean)
      .join(" ")}
  >
    <div className="stez-position-cell__label">
      <span aria-hidden="true">{icon}</span>
      {label}
    </div>
    <strong className={positive ? "is-positive" : undefined}>{value}</strong>
    <small>{note}</small>
  </div>
);

export const Stez: FC = () => {
  const wallet = useWallet();
  const selectedNetwork = "Snet";
  const [snet, setSnet] = useState<SnetNetwork | null>(null);
  const [snapshot, setSnapshot] = useState<StezSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [walletReady, setWalletReady] = useState(false);
  const [activeAction, setActiveAction] = useState<StezAction>("Stake");
  const [amount, setAmount] = useState("");
  const [transactionStage, setTransactionStage] =
    useState<TransactionStage>("idle");
  const [transactionMessage, setTransactionMessage] = useState("");
  const [operationHash, setOperationHash] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let activeSnet: SnetNetwork | null = null;
    let refreshPending = false;
    setLoading(true);
    setSnapshot(null);
    setNetworkError(null);
    setAmount("");

    const refresh = async () => {
      if (refreshPending || controller.signal.aborted) return;
      refreshPending = true;

      try {
        const nextSnet = activeSnet ?? (await resolveSnet());
        activeSnet = nextSnet;
        if (!controller.signal.aborted) setSnet(nextSnet);
        const nextSnapshot = await loadStezSnapshot(
          nextSnet.info,
          wallet.address,
          controller.signal
        );
        if (!controller.signal.aborted) {
          setSnapshot(nextSnapshot);
          setNetworkError(null);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Unable to load sTEZ state", error);
          setNetworkError(readableStezError(error));
        }
      } finally {
        refreshPending = false;
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    void refresh();
    const intervalId = window.setInterval(
      refreshWhenVisible,
      STEZ_REFRESH_INTERVAL_MS
    );
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [wallet.address]);

  useEffect(() => {
    let mounted = true;

    if (!wallet.client || !snet) {
      setWalletReady(false);
      return () => {
        mounted = false;
      };
    }

    wallet.client
      .getActiveAccount()
      .then((account) => {
        if (mounted) setWalletReady(isSnetAccount(account, snet));
      })
      .catch(() => {
        if (mounted) setWalletReady(false);
      });

    return () => {
      mounted = false;
    };
  }, [wallet.client, snet]);

  const available = snapshot?.availability === "available";
  const walletConnected =
    wallet.isWalletConnected && walletReady && Boolean(wallet.address);
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
  const walletNetStakingRewards =
    walletUnderlying !== null && snapshot?.walletStezUnits != null
      ? walletUnderlying - snapshot.walletStezUnits
      : null;
  const walletCombinedXtzValue =
    available && snapshot.walletXtzMutez !== null && walletUnderlying !== null
      ? snapshot.walletXtzMutez +
        walletUnderlying +
        (snapshot.redeemedFrozenMutez ?? ZERO) +
        (snapshot.redeemedFinalizableMutez ?? ZERO)
      : null;
  const hasRedemptionStatus =
    walletConnected &&
    ((snapshot?.redeemedFrozenMutez ?? ZERO) > ZERO ||
      (snapshot?.redeemedFinalizableMutez ?? ZERO) > ZERO);
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
  const hasTestXtz = Boolean(
    walletConnected &&
      snapshot?.walletXtzMutez !== null &&
      snapshot?.walletXtzMutez !== undefined &&
      snapshot.walletXtzMutez > ZERO
  );
  const copy = statusCopy(
    snapshot,
    loading,
    selectedNetwork,
    networkError,
    hasTestXtz
  );

  const connect = useCallback(async () => {
    const activeSnet = snet ?? (await resolveSnet());
    setSnet(activeSnet);
    await connectWalletToCustomNetwork(wallet, {
      name: activeSnet.name,
      rpcUrl: activeSnet.rpcUrl,
      chainId: activeSnet.chainId,
    });
  }, [wallet, snet]);

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
    if (!walletConnected) return "CONNECT WALLET TO SNET";
    if (transactionStage === "requesting") return "CONFIRM IN WALLET";
    if (transactionStage === "submitted") return "CONFIRMING ON SNET";
    if (transactionStage === "confirmed") return "CONFIRMED";
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
    if (activeAction === "Stake") return "STAKE XTZ";
    if (activeAction === "Redeem") return "REDEEM sTEZ";
    return "FINALIZE AND CLAIM XTZ";
  };

  const executeAction = useCallback(async () => {
    if (!walletConnected) {
      await connect();
      return;
    }
    if (!wallet.client || !wallet.address || !snet || !snapshot?.contractHash) {
      return;
    }

    setTransactionStage("requesting");
    setTransactionMessage("Review and approve the operation in your wallet.");
    setOperationHash("");

    try {
      const hash = await submitStezOperation(wallet.client, {
        action: activeAction,
        amountUnits: inputUnits,
        contractHash: snapshot.contractHash,
        redeemer: wallet.address,
      });
      setOperationHash(hash);
      setTransactionStage("submitted");
      setTransactionMessage(
        "Operation submitted. Waiting for Snet confirmation."
      );
      await waitForStezOperation(snapshot.endpoint, hash);
      const refreshed = await loadStezSnapshot(snet.info, wallet.address);
      setSnapshot(refreshed);
      setAmount("");
      setTransactionStage("confirmed");
      setTransactionMessage("Operation confirmed on Snet.");
    } catch (error) {
      setTransactionStage("failed");
      setTransactionMessage(readableStezError(error));
    }
  }, [
    activeAction,
    connect,
    inputUnits,
    snapshot,
    wallet.address,
    wallet.client,
    walletConnected,
    snet,
  ]);

  const actionDisabled =
    transactionStage === "requesting" ||
    transactionStage === "submitted" ||
    transactionStage === "confirmed" ||
    (walletConnected &&
      (!available ||
        (activeAction === "Finalize"
          ? !snapshot?.redeemedFinalizableMutez ||
            snapshot.redeemedFinalizableMutez <= ZERO
          : inputUnits <= ZERO)));

  return (
    <main className="stez-page">
      <section className="stez-hero" aria-labelledby="stez-title">
        <div>
          <span className="stez-eyebrow">PROTOCOL-NATIVE LIQUID STAKING</span>
          <h1 id="stez-title">Stake tez, stay liquid.</h1>
          <p>
            sTEZ is Tezos’ protocol-native liquid staking token. Stake XTZ to
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
        {snet && (
          <a
            className="stez-availability__faucet-link"
            href={snet.faucetUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Get${
              hasTestXtz ? " more" : ""
            } Snet test XTZ from the official Teztnets faucet`}
          >
            {hasTestXtz ? "GET MORE SNET TEST XTZ" : "GET SNET TEST XTZ"}
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
          <div
            className={`stez-position-grid${
              hasRedemptionStatus ? " has-redemption-status" : ""
            }`}
            aria-live="polite"
          >
            <PositionCell
              label="Wallet XTZ"
              value={
                walletConnected
                  ? formatUnits(snapshot?.walletXtzMutez ?? null, 4)
                  : "—"
              }
              note={walletConnected ? "Spendable now" : "Connect to view"}
              rightDivider
              icon={<AccountBalanceWalletOutlinedIcon />}
            />
            <PositionCell
              label="sTEZ Balance"
              value={
                walletConnected
                  ? formatUnits(snapshot?.walletStezUnits ?? null)
                  : "—"
              }
              note={
                walletConnected ? "Liquid and transferable" : "Connect to view"
              }
              icon={<AccountBalanceWalletOutlinedIcon />}
            />
            <PositionCell
              label="Current redemption value"
              value={walletConnected ? formatUnits(walletUnderlying) : "—"}
              note={
                walletConnected
                  ? "XTZ represented by your sTEZ at the current protocol rate"
                  : "Connect to view"
              }
              rightDivider
              icon={<SwapHorizRoundedIcon />}
            />
            <PositionCell
              label="Net staking rewards"
              value={
                walletConnected ? formatUnits(walletNetStakingRewards) : "—"
              }
              note={
                walletConnected
                  ? "XTZ gained through the protocol rate, net of fees and slashing"
                  : "Connect to view"
              }
              positive={Boolean(
                walletNetStakingRewards && walletNetStakingRewards > ZERO
              )}
              icon={<TrendingUpRoundedIcon />}
            />
            <PositionCell
              label="Combined XTZ value"
              value={
                walletConnected ? formatUnits(walletCombinedXtzValue, 4) : "—"
              }
              note={
                walletConnected
                  ? "Wallet XTZ, current sTEZ value, and XTZ in redemption"
                  : "Connect to view"
              }
              wide
              finalRow={!hasRedemptionStatus}
              icon={<AccountBalanceWalletOutlinedIcon />}
            />
            {hasRedemptionStatus && (
              <>
                <PositionCell
                  label="Redemption in progress"
                  value={formatUnits(snapshot?.redeemedFrozenMutez ?? null)}
                  note="Completing the protocol waiting period"
                  rightDivider
                  finalRow
                  icon={<LockClockOutlinedIcon />}
                />
                <PositionCell
                  label="Claimable XTZ"
                  value={formatUnits(
                    snapshot?.redeemedFinalizableMutez ?? null
                  )}
                  note="Available to return to your wallet"
                  positive={Boolean(snapshot?.redeemedFinalizableMutez)}
                  finalRow
                  icon={<CheckCircleOutlineRoundedIcon />}
                />
              </>
            )}
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
                      setTransactionStage("idle");
                      setTransactionMessage("");
                      setOperationHash("");
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
                  <span className="stez-field-label">CLAIMABLE XTZ</span>
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
                      {activeAction === "Stake"
                        ? "AMOUNT TO STAKE"
                        : "AMOUNT TO REDEEM"}
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
                          setTransactionStage("idle");
                          setTransactionMessage("");
                          setOperationHash("");
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
                      ? "ESTIMATED sTEZ"
                      : "ESTIMATED XTZ"}
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
              disabled={actionDisabled}
              aria-busy={
                transactionStage === "requesting" ||
                transactionStage === "submitted"
              }
              onClick={executeAction}
            >
              {actionButtonCopy()}
            </button>

            {transactionStage !== "idle" && (
              <div
                className={`stez-transaction-status is-${transactionStage}`}
                role={transactionStage === "failed" ? "alert" : "status"}
              >
                <span>{transactionMessage}</span>
                {operationHash && (
                  <code>{shortAddress(operationHash, 12, 8)}</code>
                )}
              </div>
            )}

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

        <details className="stez-protocol-details stez-workspace__details">
          <summary>PROTOCOL DETAILS</summary>
          <div>
            <dl>
              <dt>Network / chain ID</dt>
              <dd>
                {selectedNetwork} ·{" "}
                {shortAddress(snapshot?.chainId || snet?.chainId, 10, 6)}
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

        <details className="stez-baker-guide stez-workspace__baker">
          <summary>
            <span>RUN A BAKER ON SNET</span>
            <small>Help test sTEZ rewards</small>
          </summary>
          <div className="stez-baker-guide__body">
            <p className="stez-baker-guide__intro">
              Run a funded Snet baker, then opt it into the protocol’s sTEZ pool
              so it can receive a share of the pool’s staking power.
            </p>
            <ol className="stez-baker-guide__steps">
              <li>
                <span>01</span>
                <div>
                  <strong>RUN AND FUND A SNET BAKER</strong>
                  <p>
                    Follow the official Snet setup guide using a dedicated
                    testnet key. Register it as a delegate and stake at least
                    6,000 test XTZ.
                  </p>
                  <code>octez-client register key mybaker as delegate</code>
                  <code>octez-client stake 6000 for mybaker</code>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>OPT THE BAKER INTO sTEZ</strong>
                  <p>
                    Set the baker’s fee in millionths and declare how much sTEZ
                    staking capacity it will accept.
                  </p>
                  <code>
                    octez-client stez register key mybaker as delegate with
                    initial fee &lt;fee&gt; and capacity &lt;capacity&gt;
                  </code>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>KEEP THE BAKER AND DAL NODE ONLINE</strong>
                  <p>
                    The baker becomes eligible after the protocol delay. Never
                    run two baking daemons with the same key; doing so risks
                    double signing.
                  </p>
                </div>
              </li>
            </ol>
            <div className="stez-baker-guide__links">
              <a
                href="https://teztnets.com/snet-about"
                target="_blank"
                rel="noreferrer"
              >
                SNET SETUP GUIDE
                <ArrowOutwardRoundedIcon aria-hidden="true" />
              </a>
              <a
                href="https://octez.tezos.com/docs/u025/stez.html"
                target="_blank"
                rel="noreferrer"
              >
                sTEZ BAKER DOCUMENTATION
                <ArrowOutwardRoundedIcon aria-hidden="true" />
              </a>
            </div>
          </div>
        </details>

        <section
          className="stez-panel stez-workspace__rate"
          aria-labelledby="stez-rate-history-title"
        >
          <header className="stez-panel__head">
            <h2 id="stez-rate-history-title">RATE HISTORY</h2>
            <span>
              Block {snapshot?.blockLevel.toLocaleString("en-US") ?? "—"}
            </span>
          </header>
          <div className="stez-rate-panel">
            <div className="stez-rate-panel__current">
              <span className="stez-field-label">CURRENT RATE</span>
              <strong>
                1 sTEZ <span>=</span> {rate} XTZ
              </strong>
              <small>
                Rewards and slashing change the XTZ value represented by each
                sTEZ; they do not change the number of sTEZ in your wallet.
              </small>
            </div>
            <div className="stez-rate-panel__empty">
              <div>
                <strong>NO HISTORY YET</strong>
                <p>
                  Historical rates will appear after TEZEX has indexed enough
                  Snet observations. No projected returns are substituted.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Stez;
