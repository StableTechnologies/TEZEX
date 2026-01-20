import React, { FC, useState, useEffect, useCallback } from "react";

import {
  Token,
  Asset,
  TransactingComponent,
  TransferType,
  TransactionStatus,
  Id,
} from "../../types/general";

import { UserAmountField } from "../../components/ui/elements/inputs";
import { Wallet } from "../wallet";
import { NavLiquidity } from "../nav/NavLiquidity";
import { useSession } from "../../hooks/session";
import { useNetwork } from "../../hooks/network";
import { useWallet, useWalletOps, WalletOps } from "../../hooks/wallet";

import Box from "@mui/material/Box";
import Grid2 from "@mui/material/Unstable_Grid2";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Typography from "@mui/material/Typography";

import style from "./style";
import useStyles from "../../hooks/styles";
import { eq } from "lodash";
import { useTransaction } from "../../hooks/transaction";
import { PoolSelector } from "../ui/elements/PoolSelector";
import { getBalance } from "../../functions/beacon";

export interface IRemoveLiquidity {
  orientation: "portrait" | "landscape";
}

export const RemoveLiquidity: FC<IRemoveLiquidity> = (props) => {
  //return <div>Remove Liquidity</div>;
  const scalingKey = "removeLiquidity";
  // load styles and apply responsive scaling for component
  const styles = useStyles(style, scalingKey, false, props.orientation);
  const network = useNetwork();
  // load wallet operations for component
  const walletOps: WalletOps = useWalletOps(
    TransactingComponent.REMOVE_LIQUIDITY
  );
  // load transaction operations for component
  const transactionOps = useTransaction(TransactingComponent.REMOVE_LIQUIDITY);
  const wallet = useWallet();

  const [loading, setLoading] = useState<boolean>(true);

  // used to set input to editable or not
  const [canUpdate, setCanUpdate] = useState<boolean>(false);

  const [useMax, setUseMax] = useState<boolean>(false);
  const send = 0;
  const receive1 = 1;
  const receive2 = 2;

  const availablePools = network.getAllPools();

  // Selected pool state
  const [selectedPoolId, setSelectedPoolId] = useState<string>(
    transactionOps.getActiveTransaction()?.poolId || availablePools[0]?.id || ""
  );

  // Get current pool config
  const currentPool = availablePools.find((p) => p.id === selectedPoolId);
  const [poolBalances, setPoolBalances] = useState<Map<string, string>>(
    new Map()
  );

  // Get LP token for current pool
  const getLPToken = useCallback(
    (pool: typeof currentPool): Asset => {
      if (!pool) return network.getAsset(Token.Sirs);

      return network.getAsset(pool.lpToken);
    },
    [network.network]
  );

  const [assets, setAssets] = useState<[Asset, Asset, Asset]>([
    getLPToken(currentPool),
    network.getAsset(currentPool?.tokenA || Token.XTZ),
    network.getAsset(currentPool?.tokenB || Token.TzBTC),
  ]);
  const session = useSession();

  const active = walletOps.getActiveTransaction();

  const [id, setId] = useState<Id | undefined>(undefined);
  const [reloading, setReloading] = useState<boolean>(true);

  const handlePoolChange = useCallback(
    async (newPoolId: string) => {
      const pool = network.getAllPools().find((p) => p.id === newPoolId);
      if (!pool) return;

      setSelectedPoolId(newPoolId);
      const newAssets: [Asset, Asset, Asset] = [
        getLPToken(pool),
        network.getAsset(pool.tokenA),
        network.getAsset(pool.tokenB),
      ];
      setAssets(newAssets);

      await transactionOps.initialize(
        [newAssets[0]],
        [newAssets[1], newAssets[2]],
        newPoolId
      );
    },
    [network, getLPToken, transactionOps]
  );

  // Fetch balances for all pools
  useEffect(() => {
    const fetchBalances = async () => {
      if (!wallet.address || !network.toolkit) return;

      const balances = new Map<string, string>();
      const pools = network.getAllPools();

      for (const pool of pools) {
        try {
          const lpToken = network.getAsset(pool.lpToken);
          const balance = await getBalance(
            network.toolkit,
            wallet.address,
            lpToken
          );
          balances.set(pool.id, balance.string || "0");
        } catch (error) {
          balances.set(pool.id, "0");
        }
      }

      setPoolBalances(balances);
    };

    fetchBalances();
  }, [wallet.address, network.toolkit, network]);

  const getPoolBalance = (poolId: string): string => {
    return poolBalances.get(poolId) || "0";
  };

  const getReceiveAmounts = useCallback((): JSX.Element => {
    const transaction = transactionOps.getActiveTransaction();

    const formatWithDecimals = (value: string, decimals: number): string => {
      if (!value.includes(".")) return value;

      const [int, frac] = value.split(".");
      return `${int}.${frac.slice(0, decimals)}`;
    };
    const trimZeros = (v: string): string => {
      if (!v.includes(".")) return v;
      return v.replace(/\.?0+$/, "");
    };

    if (
      !transaction ||
      !transaction.receiveAmount[0] ||
      !transaction.receiveAmount[1]
    ) {
      return <span>0 tokens</span>;
    }

    const token1 = transaction.receiveAsset[0];
    const token2 = transaction.receiveAsset[1]!;

    const amount1 = trimZeros(
      formatWithDecimals(
        transaction.receiveAmount[0].string || "0",
        token1.decimals
      )
    );

    const amount2 = trimZeros(
      formatWithDecimals(
        transaction.receiveAmount[1].string || "0",
        token2.decimals
      )
    );

    return (
      <Box
        display="flex"
        alignItems="center"
        flexWrap="wrap"
        paddingTop={"5px"}
      >
        {/* Token 1 */}
        <Box display="flex" alignItems="center">
          <img
            src={process.env.PUBLIC_URL + token1.logo}
            alt={token1.label}
            style={styles.receiveIcons}
          />
          <Typography sx={styles.receiveTokenAmount}>
            {amount1} {token1.label}
          </Typography>
        </Box>

        {/* Plus sign */}
        <Typography sx={styles.receivePlus}>+</Typography>

        {/* Token 2 */}
        <Box display="flex" alignItems="center">
          <img
            src={process.env.PUBLIC_URL + token2.logo}
            alt={token2.label}
            style={styles.receiveIcons}
          />
          <Typography sx={styles.receiveTokenAmount}>
            {amount2} {token2.label}
          </Typography>
        </Box>
      </Box>
    );
  }, [transactionOps.getActiveTransaction]);

  // Callback to process transaction
  const transact = useCallback(async () => {
    await walletOps.sendTransaction();
  }, [walletOps.sendTransaction]);

  useEffect(() => {
    if (useMax) transactionOps.useMax();
  }, [useMax, transactionOps.useMax]);

  const newTransaction = useCallback(async () => {
    const transaction = await transactionOps.initialize(
      [assets[send]],
      [assets[receive1], assets[receive2]],
      selectedPoolId
    );
    if (transaction) {
      setLoading(false);
    }
  }, [assets, transactionOps.initialize]);

  useEffect(() => {
    if (session.activeComponent !== TransactingComponent.REMOVE_LIQUIDITY)
      session.loadComponent(TransactingComponent.REMOVE_LIQUIDITY);
  });
  useEffect(() => {
    setLoading(true);
  }, [network.network]);

  useEffect(() => {
    // get active transaction
    const transaction = transactionOps.getActiveTransaction();
    // if loading and no transaction, create new transaction
    if (loading && !transaction) {
      newTransaction();
    } else if (loading) {
      // if loading and transaction,
      // update balance, assets and set loading to false
      if (transaction && transaction.receiveAsset[1]) {
        //grab assets from transaction
        const _assets: [Asset, Asset, Asset] = [
          transaction.sendAsset[0],
          transaction.receiveAsset[0],
          transaction.receiveAsset[1],
        ];
        // Load assets if transaction assets are different from current assets
        !eq(_assets, assets) && setAssets(_assets);
        setLoading(false);
      }
    }
  }, [
    loading,
    newTransaction,
    session,
    transactionOps.getActiveTransaction,
    assets,
  ]);

  //callback to handle transaction status changes
  const monitorStatus = useCallback(() => {
    const transaction = transactionOps.getActiveTransaction();
    const _canUpdate: boolean = (() => {
      if (transaction) {
        switch (transaction.transactionStatus) {
          case TransactionStatus.PENDING:
            return false;
          case TransactionStatus.UNINITIALIZED:
            return false;
          case TransactionStatus.COMPLETED:
            return false;
          default:
            return true;
        }
      } else {
        return false;
      }
    })();

    setCanUpdate((canUpdate) => {
      if (canUpdate === _canUpdate) return canUpdate;
      return _canUpdate;
    });

    // current transaction id in wallet context
    const transactionId = transaction?.id;
    // if no id and transaction id, set id and set reloading to true
    if (!id && transactionId) {
      setId(transactionId);
      setReloading(true);
    }
    // if id and transaction id and different, set id and set reloading to true
    if (id && transactionId && id !== transactionId) {
      setId(transactionId);
      setReloading(true);
      setUseMax(false);
    }
  }, [transactionOps.getActiveTransaction, id]);

  // effect to monitor transaction status by calling monitorStatus
  useEffect(() => {
    monitorStatus();
  }, [monitorStatus]);

  // Effect to reload new transactions
  useEffect(() => {
    const timer = setTimeout(() => {
      // get active transaction
      const t = transactionOps.getActiveTransaction();
      // if loading and no transaction, create new transaction
      if (reloading && t) {
        // if loading and transaction,
        // update balance, assets and set loading to false
        if (t.receiveAsset[1]) {
          //grab assets from transaction
          const _assets: [Asset, Asset, Asset] = [
            t.sendAsset[0],
            t.receiveAsset[0],
            t.receiveAsset[1],
          ];
          // reload assets
          setAssets(_assets);
          setReloading(false);
        }
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [transactionOps.getActiveTransaction, assets, reloading]);

  // get loading status for child compoenents
  const isLoaded = useCallback(() => {
    return !loading && !reloading;
  }, [loading, reloading]);

  return (
    <Grid2 container sx={styles.root}>
      <Card sx={styles.card}>
        <CardHeader
          sx={styles.cardHeader}
          title={
            <Box>
              <NavLiquidity scalingKey={scalingKey} />
            </Box>
          }
        />

        {/* Pool Selector */}
        <Grid2
          container
          justifyContent="center"
          sx={styles.poolSelectorContainer}
        >
          <Grid2 sx={{ width: "100%" }}>
            <PoolSelector
              selectedPoolId={selectedPoolId}
              onChange={handlePoolChange}
              disabled={!canUpdate}
              sx={styles.poolSelector}
              showBalance={true}
              getPoolBalance={getPoolBalance}
            />
          </Grid2>
        </Grid2>

        <CardContent sx={styles.cardcontent}>
          <Box sx={styles.cardContentBox}>
            <Box sx={styles.input1}>
              <UserAmountField
                asset={assets[send]}
                transferType={TransferType.SEND}
                component={TransactingComponent.REMOVE_LIQUIDITY}
                readOnly={useMax || !canUpdate}
                variant="LeftInput"
                scalingKey={scalingKey}
                loading={!isLoaded()}
              />
            </Box>
            <Button
              sx={styles.useMax}
              onClick={(event) => {
                event.preventDefault();
                setUseMax((prev) => !prev);
              }}
            >
              <Typography
                sx={
                  useMax
                    ? styles.useMaxTypographyEnabled
                    : styles.useMaxTypographyDisabled
                }
              >
                {"Use Max"}
              </Typography>
            </Button>
          </Box>
          <Box>
            <Grid2 xs={12} sx={styles.receiveInfo}>
              <Typography sx={styles.receiveText}>
                You will receive about: {getReceiveAmounts()}
              </Typography>
            </Grid2>
          </Box>
        </CardContent>

        <CardActions sx={styles.cardAction}>
          <Box sx={styles.wallet}>
            <Wallet
              component={TransactingComponent.REMOVE_LIQUIDITY}
              transaction={active}
              callback={transact}
              scalingKey={scalingKey}
            >
              {"Sell Shares"}
            </Wallet>
          </Box>
        </CardActions>
      </Card>
    </Grid2>
  );
};
