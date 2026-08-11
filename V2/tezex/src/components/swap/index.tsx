import React, {
  FC,
  useState,
  useEffect,
  useCallback,
  useSyncExternalStore,
} from "react";
import BigNumber from "bignumber.js";

import {
  Asset,
  TransactingComponent,
  TransferType,
  TransactionStatus,
  Id,
  Token,
} from "../../types/general";
import { PoolType } from "../../types/pools";

import { UserAmountField, Slippage } from "../../components/ui/elements/inputs";
import { Wallet } from "../wallet";
import { useSession } from "../../hooks/session";
import { useWallet, useWalletOps, WalletOps } from "../../hooks/wallet";
import { SwapUpDownToggle } from "../../components/ui/elements/Toggles";
import { useNetwork } from "../../hooks/network";
import { getExplorer } from "../../functions/util";
import { formatTezexFeeLabel } from "../../functions/tezexFeeModel";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";

import style from "./style";
import { TransactionProgress } from "./TransactionProgress";
import useStyles from "../../hooks/styles";
import { useTransaction } from "../../hooks/transaction";
import { eq } from "lodash";
import {
  findPoolForTokenPair,
  getCompatibleSwapAssets,
  getSwapDisplaySymbol,
} from "./tokenRouting";
import { TradingLoadingState } from "../ui/elements/loading/TezexLoading";
import { SwapRouteSelection } from "../../tradeRouting";

export interface ISwapToken {
  orientation: "portrait" | "landscape";
  routeSelection?: SwapRouteSelection;
  onRouteChange?: (sendToken: Token, receiveToken: Token) => void;
}

const formatAmount = (value: BigNumber | undefined, decimals = 6): string => {
  if (!value || !value.isFinite()) return "—";

  const fixed = value
    .decimalPlaces(Math.min(Math.max(decimals, 2), 8), BigNumber.ROUND_DOWN)
    .toFixed();

  return fixed.includes(".")
    ? fixed.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "")
    : fixed;
};

const getStatusLabel = (status?: TransactionStatus): string => {
  switch (status) {
    case TransactionStatus.MODIFIED:
      return "Requesting price";
    case TransactionStatus.INSUFFICIENT_BALANCE:
      return "Insufficient balance";
    case TransactionStatus.INVALID_SLIPPAGE:
      return "Check slippage";
    case TransactionStatus.SUFFICIENT_BALANCE:
      return "Ready to swap";
    case TransactionStatus.PENDING:
      return "Approve in wallet";
    case TransactionStatus.SUBMITTED:
      return "Confirming on Tezos";
    case TransactionStatus.CONFIRMATION_UNKNOWN:
      return "Check operation status";
    case TransactionStatus.COMPLETED:
      return "Swap complete";
    case TransactionStatus.FAILED:
      return "Ready to retry";
    case TransactionStatus.ZERO_AMOUNT:
    case TransactionStatus.INITIALIZED:
    case TransactionStatus.UNINITIALIZED:
      return "Enter an amount";
    default:
      return "Preparing request";
  }
};

export const Swap: FC<ISwapToken> = ({ routeSelection, onRouteChange }) => {
  const scalingKey = "swap";
  const styles = useStyles(style, scalingKey);
  const network = useNetwork();
  const wallet = useWallet();
  const walletOps: WalletOps = useWalletOps(TransactingComponent.SWAP, true);
  const transactionOps = useTransaction(TransactingComponent.SWAP);

  const [id, setId] = useState<Id | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [reloading, setReloading] = useState<boolean>(true);

  const send = 0;
  const receive = 1;

  const availablePools = network.getAllPools();
  const currentPool = routeSelection?.pool || network.selectedPool;

  const [assets, setAssets] = useState<[Asset, Asset]>(() => {
    if (routeSelection) {
      return [
        network.getAsset(routeSelection.sendToken),
        network.getAsset(routeSelection.receiveToken),
      ];
    }
    if (currentPool) {
      return [
        network.getAsset(currentPool.tokenA),
        network.getAsset(currentPool.tokenB),
      ];
    }
    return [
      network.getAsset(availablePools[0]?.tokenA),
      network.getAsset(availablePools[0]?.tokenB),
    ];
  });

  const [swappingFileds, setSwappingFileds] = useState<boolean>(false);
  const [sendInputValue, setSendInputValue] = useState("0.00");
  const session = useSession();
  const [canUpdate, setCanUpdate] = useState<boolean>(false);
  const previewLoading =
    process.env.NODE_ENV === "development" &&
    new URLSearchParams(window.location.search).has("loading");

  const active = walletOps.getActiveTransaction();

  useEffect(() => {
    const pools = network.getAllPools();
    if (pools.length > 0) {
      const nextPool = routeSelection?.pool || pools[0];
      setAssets([
        network.getAsset(routeSelection?.sendToken || nextPool.tokenA),
        network.getAsset(routeSelection?.receiveToken || nextPool.tokenB),
      ]);
      setLoading(true);
    }
  }, [network.network]);

  useEffect(() => {
    if (!routeSelection) return;

    const nextAssets: [Asset, Asset] = [
      network.getAsset(routeSelection.sendToken),
      network.getAsset(routeSelection.receiveToken),
    ];
    const routeAlreadyLoaded =
      assets[send].name === nextAssets[send].name &&
      assets[receive].name === nextAssets[receive].name;

    if (routeAlreadyLoaded) return;

    network.setSelectedPool(routeSelection.pool);
    setAssets(nextAssets);
    setSendInputValue("0.00");
    wallet.clearTransaction(TransactingComponent.SWAP);
    setLoading(true);
    setReloading(true);
  }, [
    routeSelection?.pool.id,
    routeSelection?.sendToken,
    routeSelection?.receiveToken,
    network.network,
  ]);

  const handleAssetChange = useCallback(
    async (side: typeof send | typeof receive, nextAsset: Asset) => {
      const nextAssets: [Asset, Asset] = [...assets];
      nextAssets[side] = nextAsset;

      const pool = findPoolForTokenPair(
        network.getAllPools(),
        nextAssets[send].name,
        nextAssets[receive].name
      );
      if (!pool) return;

      network.setSelectedPool(pool);
      setAssets(nextAssets);
      setSendInputValue("0.00");
      onRouteChange?.(nextAssets[send].name, nextAssets[receive].name);

      wallet.clearTransaction(TransactingComponent.ADD_LIQUIDITY);
      wallet.clearTransaction(TransactingComponent.REMOVE_LIQUIDITY);
      await transactionOps.initialize(
        [nextAssets[send]],
        [nextAssets[receive]],
        pool.id
      );
    },
    [assets, network, onRouteChange, transactionOps, wallet]
  );

  const transact = useCallback(async () => {
    await walletOps.sendTransaction();
  }, [walletOps]);

  const swapFields = useCallback(async () => {
    setAssets([assets[1], assets[0]]);
    onRouteChange?.(assets[receive].name, assets[send].name);
    await transactionOps.swapFields();
  }, [assets, onRouteChange, transactionOps]);

  const newTransaction = useCallback(async () => {
    const transactionPool =
      routeSelection?.pool ||
      findPoolForTokenPair(
        network.getAllPools(),
        assets[send].name,
        assets[receive].name
      ) ||
      currentPool;
    const transaction = await transactionOps.initialize(
      [assets[send]],
      [assets[receive]],
      transactionPool?.id || ""
    );

    if (transaction) {
      if (swappingFileds) setSwappingFileds(false);
      setCanUpdate(true);
      setLoading(false);
    }
  }, [
    swappingFileds,
    assets,
    transactionOps,
    currentPool,
    routeSelection,
    network,
  ]);

  useEffect(() => {
    const transaction = transactionOps.getActiveTransaction();
    if (loading && !transaction) {
      newTransaction();
    } else if (loading && transaction) {
      const nextAssets: [Asset, Asset] = [
        transaction.sendAsset[0],
        transaction.receiveAsset[0],
      ];
      !eq(nextAssets, assets) && setAssets(nextAssets);
      setLoading(false);
    }
  }, [loading, newTransaction, transactionOps, assets]);

  useEffect(() => {
    if (session.activeComponent !== TransactingComponent.SWAP) {
      session.loadComponent(TransactingComponent.SWAP);
    }
  }, [session]);

  const monitorStatus = useCallback(() => {
    const transaction = transactionOps.getActiveTransaction();
    const nextCanUpdate = (() => {
      if (!transaction) return false;

      switch (transaction.transactionStatus) {
        case TransactionStatus.PENDING:
        case TransactionStatus.SUBMITTED:
        case TransactionStatus.CONFIRMATION_UNKNOWN:
        case TransactionStatus.UNINITIALIZED:
        case TransactionStatus.COMPLETED:
          return false;
        default:
          return true;
      }
    })();

    setCanUpdate((current) =>
      current === nextCanUpdate ? current : nextCanUpdate
    );

    const transactionId = transaction?.id;
    if (!id && transactionId) {
      setId(transactionId);
      setReloading(true);
    }
    if (id && transactionId && id !== transactionId) {
      setId(transactionId);
      setReloading(true);
    }
  }, [transactionOps, id]);

  useEffect(() => {
    monitorStatus();
  }, [monitorStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const transaction = transactionOps.getActiveTransaction();
      if (reloading && transaction) {
        setAssets([transaction.sendAsset[0], transaction.receiveAsset[0]]);
        setReloading(false);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [transactionOps, assets, reloading]);

  const isLoaded = useCallback(
    () => !loading && !reloading,
    [loading, reloading]
  );

  if (loading || previewLoading) return <TradingLoadingState variant="swap" />;

  const transaction = transactionOps.getActiveTransaction() || active;
  const sendAssetOptions = getCompatibleSwapAssets(
    availablePools,
    assets[receive].name,
    network.getAsset
  );
  const receiveAssetOptions = getCompatibleSwapAssets(
    availablePools,
    assets[send].name,
    network.getAsset
  );
  const sendAmount = transaction?.sendAmount[0]?.decimal;
  const receiveAmount = transaction?.receiveAmount[0]?.decimal;
  const hasEnteredAmount = new BigNumber(sendInputValue || 0).isGreaterThan(0);
  const hasQuote = Boolean(
    hasEnteredAmount &&
      transaction?.quote &&
      sendAmount &&
      receiveAmount &&
      sendAmount.isGreaterThan(0)
  );
  const exchangeRate = hasQuote
    ? receiveAmount?.dividedBy(sendAmount as BigNumber)
    : undefined;
  const slippage = transaction?.slippage ?? 0.5;
  const minimumReceived = receiveAmount
    ? BigNumber.maximum(
        receiveAmount.times(new BigNumber(1).minus(slippage / 100)),
        0
      )
    : undefined;
  const status = transaction?.transactionStatus;
  const statusLabel = hasQuote ? getStatusLabel(status) : "Enter an amount";
  const statusStep =
    status === TransactionStatus.COMPLETED
      ? 3
      : hasQuote &&
        (status === TransactionStatus.PENDING ||
          status === TransactionStatus.SUBMITTED ||
          status === TransactionStatus.CONFIRMATION_UNKNOWN)
      ? 2
      : 1;

  const sendSymbol = getSwapDisplaySymbol(assets[send]);
  const receiveSymbol = getSwapDisplaySymbol(assets[receive]);
  const tradeTitle = `Trade ${sendSymbol} to ${receiveSymbol}`;
  const routeLabel = `${sendSymbol} → ${receiveSymbol}`;
  const feeLabel =
    currentPool?.type === PoolType.SIRIUS
      ? "0.1% fee + 0.1% XTZ burn"
      : currentPool?.type === PoolType.TEZEX
      ? formatTezexFeeLabel({
          lpFeeBp: cachedPoolData?.lpFeeBp ?? 30,
          protocolFeeBp: cachedPoolData?.protocolFeeBp ?? 0,
          totalFeeBp: cachedPoolData?.totalFeeBp ?? 30,
        })
      : "Pool-defined";
  const contractLabel = currentPool?.address
    ? `${currentPool.address.slice(0, 7)}…${currentPool.address.slice(-6)}`
    : "—";
  const explorerUrl = currentPool?.address
    ? `${getExplorer(network.network)}${currentPool.address}`
    : undefined;
  return (
    <Box sx={styles.boxRoot}>
      <Box sx={styles.root}>
        <Card sx={styles.card}>
          <Box sx={styles.cardHeader}>
            <Box sx={styles.headerTitleGroup}>
              <Typography sx={styles.eyebrow}>SWAP</Typography>
              <Typography sx={styles.headerTitle}>{tradeTitle}</Typography>
            </Box>
          </Box>

          <CardContent sx={styles.cardContent}>
            <Box sx={styles.amountField}>
              <UserAmountField
                component={TransactingComponent.SWAP}
                transferType={TransferType.SEND}
                asset={assets[send]}
                onChange={setSendInputValue}
                readOnly={!canUpdate}
                scalingKey={scalingKey}
                loading={!isLoaded()}
                label="Swap from"
                visualVariant="tezex"
                selectableAssets={sendAssetOptions}
                onAssetChange={(asset) => handleAssetChange(send, asset)}
                assetSelectionDisabled={!canUpdate}
              />
            </Box>

            <Box sx={styles.swapToggle}>
              <SwapUpDownToggle toggle={swapFields} scalingKey={scalingKey} />
            </Box>

            <Box sx={styles.amountField}>
              <UserAmountField
                component={TransactingComponent.SWAP}
                transferType={TransferType.RECEIVE}
                asset={assets[receive]}
                readOnly
                forceZero={!hasEnteredAmount}
                scalingKey={scalingKey}
                loading={!isLoaded()}
                label="Swap to"
                visualVariant="tezex"
                selectableAssets={receiveAssetOptions}
                onAssetChange={(asset) => handleAssetChange(receive, asset)}
                assetSelectionDisabled={!canUpdate}
              />
            </Box>

            <Box sx={styles.quoteLine} aria-live="polite">
              <Typography sx={styles.quoteText}>
                {exchangeRate
                  ? `1 ${assets[send].label} = ${formatAmount(
                      exchangeRate,
                      assets[receive].decimals
                    )} ${assets[receive].label}`
                  : "Enter an amount to load a live pool quote"}
              </Typography>
              <Typography sx={styles.quoteStatus}>{statusLabel}</Typography>
            </Box>
          </CardContent>

          <CardActions sx={styles.cardActions}>
            <Wallet
              component={TransactingComponent.SWAP}
              transaction={active}
              callback={transact}
              scalingKey={scalingKey}
              visualVariant="dark"
            >
              Swap
            </Wallet>
          </CardActions>

          <Box sx={styles.slippageRow}>
            <Box>
              <Typography sx={styles.slippageLabel}>
                Slippage tolerance
              </Typography>
              <Typography sx={styles.slippageHelp}>
                Maximum accepted price movement
              </Typography>
            </Box>
            <Slippage
              component={TransactingComponent.SWAP}
              transferType={TransferType.RECEIVE}
              scalingKey={scalingKey}
              visualVariant="dark"
            />
          </Box>
        </Card>

        <Box sx={styles.contextColumn}>
          <Box sx={styles.detailsPanel}>
            <Box sx={styles.panelHeader}>
              <Box sx={styles.headerTitleGroup}>
                <Typography sx={styles.eyebrow}>SWAP DETAILS</Typography>
                <Typography sx={styles.headerTitle}>{routeLabel}</Typography>
              </Box>
              <Box sx={styles.liveBadge}>
                <Box sx={styles.liveDot} />
                {network.network.toString().toLowerCase()}
              </Box>
            </Box>

            <Box sx={styles.detailList}>
              <Box sx={styles.detailRow}>
                <Typography sx={styles.detailLabel}>Pool</Typography>
                <Typography sx={styles.detailValue}>
                  {currentPool?.name ?? "—"}
                </Typography>
              </Box>
              <Box sx={styles.detailRow}>
                <Typography sx={styles.detailLabel}>Pool cost</Typography>
                <Typography sx={styles.detailValue}>{feeLabel}</Typography>
              </Box>
              <Box sx={styles.detailRow}>
                <Typography sx={styles.detailLabel}>
                  Minimum received
                </Typography>
                <Typography sx={styles.detailValueMono}>
                  {hasQuote && minimumReceived
                    ? `${formatAmount(
                        minimumReceived,
                        assets[receive].decimals
                      )} ${assets[receive].label}`
                    : "—"}
                </Typography>
              </Box>
              <Box sx={styles.detailRow}>
                <Typography sx={styles.detailLabel}>Slippage</Typography>
                <Typography sx={styles.detailValueMono}>
                  {slippage.toFixed(1)}%
                </Typography>
              </Box>
              <Box sx={styles.detailRow}>
                <Typography sx={styles.detailLabel}>Pool contract</Typography>
                {explorerUrl ? (
                  <Link
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={styles.contractLink}
                  >
                    {contractLabel}
                  </Link>
                ) : (
                  <Typography sx={styles.detailValueMono}>—</Typography>
                )}
              </Box>
            </Box>

            <Box sx={styles.trustNote}>
              Quotes come from the on-chain pool matching the selected tokens.
              Review every amount and destination in your wallet before
              approving.
            </Box>
          </Box>

          <Box sx={styles.statusPanel} aria-live="polite">
            <Box sx={styles.statusHeader}>
              <Typography sx={styles.eyebrow}>TRANSACTION STATUS</Typography>
              <Typography sx={styles.statusText}>{statusLabel}</Typography>
            </Box>

            <TransactionProgress statusStep={statusStep} styles={styles} />

            <Typography sx={styles.statusFootnote}>
              Request gets a live pool price. Swap covers wallet approval and
              on-chain execution. Complete means the operation is confirmed on
              Tezos.
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
