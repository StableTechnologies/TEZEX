const config = require(`./${process.env.BOT_ENV || "prod"
  }-network-config.json`);
const Web3 = require("web3");
const respondToSwap = require("./respond-to-swap");
const { calcSwapReturn, getAssets, getCounterPair, STATE } = require("./util");
const { constants } = require("./util");
const fetch = require("node-fetch");
const { BigNumber } = require("bignumber.js");
const { Mutex } = require("async-mutex");
const Ethereum = require("./ethereum");
const Tezos = require("./tezos");

module.exports = class Bot {
  constructor(logger) {
    this.reward = 0; // reward for responding to user swaps, taken from tezos contract
    this.maxEthSwaps = 5; // max swaps than can be ran in parallel on eth network
    this.maxTezSwaps = 5; // max swaps than can be ran in parallel on tezos network
    this.swapPairs = {}; // arranged pair wise (eg. "usdc/usdtz") and contains contract details, fee details and volume stats for the swap pair
    this.swaps = {}; // list of all swaps from any pair, each swap besides it's common attributes will have a `pair` and a `side` param to identify which pair and side the swap belongs to
    this.logger = logger;
  }

  /**
   * Initiate the tezex bot, configure ethereum and tezos clients and signers
   *
   * @param ethConfig user config for ethereum {walletPK:string}
   * @param tezosConfig user config for tezos {walletPK:string}
   * @param volume max volume of assets to be traded for each pair
   */
  async init(ethConfig, tezosConfig, volume) {
    try {
      console.log("\nInitializing Bot...");
      this.logger.warn("Setting Up Bot");
      const ethMutex = new Mutex();
      const tezMutex = new Mutex();
      const pairs = Object.keys(config.pairs);
      const web3 = new Web3(
        new Web3.providers.HttpProvider(config.ethereum.RPC)
      );
      let balanceRequirements = {
        eth: {
          network: "ethereum",
          symbol: "ETH",
          decimals: 18,
          contract: undefined,
          need: new BigNumber(0),
        },
        xtz: {
          network: "tezos",
          symbol: "XTZ",
          decimals: 6,
          contract: undefined,
          need: new BigNumber(0),
        },
      };
      pairs.forEach((pair) => {
        const assets = getAssets(pair);
        if (Object.prototype.hasOwnProperty.call(volume, pair))
          for (const asset of assets) {
            let swapContract = config.pairs[pair][asset].swapContract,
              tokenContract = config.pairs[pair][asset].tokenContract;
            if (config.pairs[pair][asset].network === "ethereum") {
              swapContract = new web3.eth.Contract(
                config.pairs[pair][asset].swapContract.abi,
                config.pairs[pair][asset].swapContract.address
              );
              tokenContract =
                asset !== "eth"
                  ? new web3.eth.Contract(
                    config.pairs[pair][asset].tokenContract.abi,
                    config.pairs[pair][asset].tokenContract.address
                  )
                  : undefined;
            }
            volume[pair][asset] = new BigNumber(
              new BigNumber(volume[pair][asset])
                .multipliedBy(10 ** config.pairs[pair][asset].decimals)
                .toFixed(0, 3)
            );
            if (
              !Object.prototype.hasOwnProperty.call(balanceRequirements, asset)
            )
              balanceRequirements[asset] = {
                symbol: config.pairs[pair][asset].symbol,
                decimals: config.pairs[pair][asset].decimals,
                network: config.pairs[pair][asset].network,
                contract: tokenContract,
                need: volume[pair][asset],
              };
            else
              balanceRequirements[asset].need = balanceRequirements[
                asset
              ].need.plus(volume[pair][asset]);
            this.swapPairs[pair] = {
              ...this.swapPairs[pair],
              [asset]: {
                network: config.pairs[pair][asset].network,
                swapContract: swapContract,
                tokenContract: tokenContract,
                remainingVolume: volume[pair][asset],
                decimals: config.pairs[pair][asset].decimals,
                symbol: config.pairs[pair][asset].symbol,
              },
            };
          }
      });
      this.clients = {
        ethereum: new Ethereum(
          web3,
          ethConfig.walletPK,
          config.ethereum.chain,
          ethMutex
        ),
        tezos: new Tezos(
          tezosConfig.walletPK,
          config.tezos.priceOracle,
          config.tezos.feeContract,
          config.tezos.chain_id,
          config.tezos.RPC,
          config.tezos.conseilServer,
          tezMutex
        ),
      };
      await this.clients["tezos"].initConseil();
      const data = await Promise.all([
        this.getBalances(balanceRequirements),
        this.getWorstCaseNetworkFees(),
      ]);
      this.logger.warn("start volume", volume);
      return {
        ethAccount: this.clients["ethereum"].account,
        tezosAccount: this.clients["tezos"].account,
        balanceRequirements: data[0],
        networkFees: data[1],
      };
    } catch (err) {
      console.error("Bot Init failed | \n");
      this.logger.error("bot setup failed", err);
      throw err;
    }
  }

  /**
   * Starts the bot and launches concurrent threads[*] for monitoring swaps on both
   * ethereum and tezos networks as well as threads for refunding swaps and
   * updating reward
   */
  async start() {
    try {
      console.log("\n\n[!] INITIALIZING BOT! PLEASE WAIT...\n");
      let allowanceCheck = [];
      const pairs = Object.keys(this.swapPairs);
      for (const pair of pairs) {
        const assets = pair.split("/");
        for (const asset of assets) {
          const network = this.swapPairs[pair][asset].network;
          if (asset !== "eth" && asset !== "xtz")
            allowanceCheck.push(
              this.clients[network].tokenAllowance(
                this.swapPairs[pair][asset].tokenContract,
                this.swapPairs[pair][asset].swapContract,
                this.clients[network].account
              )
            );
        }
      }
      const allowances = await Promise.all(allowanceCheck);
      let approveOps = [],
        i = 0;
      for (const pair of pairs) {
        const assets = pair.split("/");
        for (const asset of assets) {
          const network = this.swapPairs[pair][asset].network;
          if (asset !== "eth" && asset !== "xtz") {
            if (
              !new BigNumber(allowances[i]).eq(
                this.swapPairs[pair][asset].remainingVolume
              )
            ) {
              this.logger.warn(
                `mismatch for ${asset} : ${allowances[i]} ${this.swapPairs[
                  pair
                ][asset].remainingVolume.toString()}`
              );
              approveOps.push(
                this.clients[network].approveToken(
                  this.swapPairs[pair][asset].tokenContract,
                  this.swapPairs[pair][asset].swapContract,
                  this.swapPairs[pair][asset].remainingVolume.toString()
                )
              );
            }
            i++;
          }
        }
      }
      await Promise.all(approveOps);
      console.log("\n[!] BOT INITIALIZED");
      await this.monitorReward(true);
      this.liveUpdate();
      this.monitorReward();
      for (const pair of pairs) {
        const assets = pair.split("/");
        for (const asset of assets) {
          this.monitorSwaps(pair, asset);
        }
      }
      this.monitorRefunds();
    } catch (err) {
      this.logger.error("bot start failed", err);
      throw err;
    }
  }

  /**
   * Updates the state of the swap and deletes the swap if it has been cancelled
   *
   * @param swap the swap object
   */
  async updateSwap(swap) {
    try {
      switch (swap.state) {
        case STATE.DONE: {
          delete this.swaps[swap.hashedSecret];
          break;
        }
        case STATE.REFUNDED: {
          try {
            delete this.swaps[swap.hashedSecret];
            const tempVal = this.swapPairs[swap.pair][
              swap.asset
            ].remainingVolume.plus(swap.value);
            const allowance = await this.clients[swap.network].tokenAllowance(
              this.swapPairs[swap.pair][swap.asset].tokenContract,
              this.swapPairs[swap.pair][swap.asset].swapContract,
              this.clients[swap.network].account
            );
            if (!new BigNumber(allowance).eq(tempVal))
              await this.clients[swap.network].approveToken(
                this.swapPairs[swap.pair][swap.asset].tokenContract,
                this.swapPairs[swap.pair][swap.asset].swapContract,
                tempVal.toString()
              );
            this.swapPairs[swap.pair][swap.asset].remainingVolume = tempVal;
          } catch (err) {
            console.error("[x] FAILED TO RE-APPROVE FUNDS" + "\n" + err);
            this.logger.error(`re-approval failed : ${swap.hashedSecret}`, err);
          }
          break;
        }
        default: {
          this.swaps[swap.hashedSecret] = swap;
        }
      }
    } catch (err) {
      this.logger.error(`swap state update failed : ${swap.hashedSecret}`, err);
      console.log(err);
    } finally {
      this.logger.warn(`current swaps`, { swap: this.swaps });
    }
  }

  /**
   * Monitors and refunds all cancelled/error swaps
   */
  monitorRefunds() {
    const run = async () => {
      console.log("[*] CHECKING REFUNDABLE SWAPS");
      this.logger.info("checking refundable swaps");
      const keys = Object.keys(this.swaps);
      for (const key of keys) {
        if (
          this.swaps[key].state === STATE.ERROR &&
          this.swaps[key].refundTime <= Date.now() / 1000
        ) {
          const refAsset = this.swaps[key].asset;
          try {
            console.log(`[!] REFUNDING SWAP(${this.swaps[key].asset}): ${key}`);
            // check if swap already redeemed or refunded if so no point in trying
            const swp = await this.clients[this.swaps[key].network].getSwap(
              this.swapPairs[this.swaps[key].pair][this.swaps[key].asset]
                .swapContract,
              key
            );
            if (
              (this.swaps[key].network === "ethereum" &&
                swp.initiator_tez_addr === "" &&
                swp.refundTimestamp === "0") ||
              (this.swaps[key].network === "tezos" && swp === undefined)
            ) {
              console.log(
                `[!] SWAP IS ALREADY REDEEMED OR REFUNDED ${this.swapPairs[this.swaps[key].pair][this.swaps[key].asset].symbol
                } SWAP : ${key}\n`
              );
              this.logger.warn("swap already redeemed or refunded", { swap: key });
              this.swaps[key].state = STATE.REFUNDED;
              await this.updateSwap(this.swaps[key]);
              continue;
            }
            this.logger.warn("refunding swap", { swap: this.swaps[key] });
            await this.clients[this.swaps[key].network].refund(
              this.swapPairs[this.swaps[key].pair][this.swaps[key].asset]
                .swapContract,
              key
            );
            this.swaps[key].state = STATE.REFUNDED;
            await this.updateSwap(this.swaps[key]);
            console.log(`[!] REFUNDED SWAP(${refAsset}): ${key}`);
          } catch (err) {
            console.error(
              `[x] FAILED TO REFUND SWAP(${refAsset}): ${key}\n` +
              err
            );
            this.logger.error(`failed to refund swap: ${key}`, err);
          }
        }
      }
      setTimeout(run, 120000);
    };
    run();
  }

  /**
   * Monitors swap requests and responds to suitable swaps for the particular pair & asset combo
   *
   * @param pair valid swap pair eg. "usdc/usdtz"
   * @param counterAsset valid asset from the swap pair eg. usdc from "usdc/usdtz" pair, which wil be monitored
   */
  monitorSwaps(pair, counterAsset) {
    const counterNetwork = this.swapPairs[pair][counterAsset].network;
    const asset = getCounterPair(pair, counterAsset);
    const network = this.swapPairs[pair][asset].network;
    const run = async () => {
      try {
        if (this.swapPairs[pair][asset].remainingVolume.eq(0)) return;
        console.log(
          `[*] CHECKING ${this.swapPairs[pair][counterAsset].symbol} SWAPS`
        );
        this.logger.info(
          `checking ${this.swapPairs[pair][counterAsset].symbol} swaps`
        );
        const waitingSwaps = await this.clients[counterNetwork].getWaitingSwaps(
          this.swapPairs[pair][counterAsset].swapContract,
          4200
        );
        const keys = Object.keys(waitingSwaps);
        for (const i of keys) {
          const swp = waitingSwaps[i];
          if (!this.swapPossible(network)) break;
          const existingResponse = await this.clients[network].getSwap(
            this.swapPairs[pair][asset].swapContract,
            swp.hashedSecret
          );
          if (
            ((network === "tezos" && existingResponse === undefined) ||
              (network === "ethereum" &&
                existingResponse.initiator_tez_addr === "" &&
                existingResponse.refundTimestamp === "0")) &&
            this.swaps[swp.hashedSecret] === undefined &&
            new BigNumber(swp.value).gt(0) &&
            new BigNumber(swp.value).lte(
              this.swapPairs[pair][asset].remainingVolume
            )
          ) {
            console.log(
              `[!] FOUND ${this.swapPairs[pair][counterAsset].symbol} SWAP: `,
              swp.hashedSecret
            );
            this.logger.warn(
              `found ${this.swapPairs[pair][counterAsset].symbol} swap`,
              { swap: swp }
            );
            let valueToPay = new BigNumber(
              calcSwapReturn(swp.value, this.reward)
            );
            valueToPay = this.assetConverter[pair][asset](valueToPay);
            if (valueToPay.lt(this.swapPairs[pair][asset].networkFee)) {
              console.log("[x] SWAP NOT PROFITABLE : ", swp.hashedSecret);
              this.logger.warn(
                `${this.swapPairs[pair][counterAsset].symbol} swap not profitable`,
                { swap: swp }
              );
              continue;
            }
            valueToPay = valueToPay.minus(
              this.swapPairs[pair][asset].networkFee
            );
            this.swaps[swp.hashedSecret] = {
              state: STATE.START,
              originalValue: swp.value,
              value: valueToPay.toString(),
              hashedSecret: swp.hashedSecret,
              refundTime:
                swp.refundTimestamp -
                config.swapConstants.refundPeriod /
                config.swapConstants.refundFactor,
              network: network,
              pair: pair,
              asset: asset,
            };
            this.swapPairs[pair][asset].remainingVolume = this.swapPairs[pair][
              asset
            ].remainingVolume.minus(valueToPay);
            respondToSwap(
              this.swaps[swp.hashedSecret],
              counterNetwork,
              counterAsset,
              this,
              STATE.START
            );
          }
        }
      } catch (err) {
        console.error(
          `[x] FAILED TO MONITOR ${this.swapPairs[pair][asset].symbol} SWAPS\n`,
          err
        );
        this.logger.error(
          `failed to monitor ${this.swapPairs[pair][asset].symbol} swaps`,
          err
        );
      }
      setTimeout(run, 120000);
    };
    run();
  }

  /**
   * Monitors and updates the reward (basis points) value
   * and tx fees for each swap pair
   */
  async monitorReward(runOnce = false) {
    const run = async () => {
      console.log("[*] UPDATING REWARDS");
      this.logger.info(`updating rewards`);
      try {
        const data = await Promise.all([
          this.getBotFees(),
          this.getConverter(),
        ]);
        const pureFees = this.getPureSwapFee(data[0]);
        const pairs = Object.keys(this.swapPairs);
        for (const pair of pairs) {
          const assets = pair.split("/");
          this.swapPairs[pair][assets[0]]["networkFee"] = data[1].feeConverter[
            assets[0]
          ](pureFees[pair][assets[0]]);
          this.swapPairs[pair][assets[1]]["networkFee"] = data[1].feeConverter[
            assets[1]
          ](pureFees[pair][assets[1]]);
        }
        this.assetConverter = data[1].assetConverter;
        this.reward = new BigNumber(data[0].reward);

        let swapStats = "";
        const currentSwapStats = {};
        for (const pair of pairs) {
          const assets = pair.split("/");
          swapStats += `    [-] ${this.swapPairs[pair][assets[0]].symbol}/${this.swapPairs[pair][assets[1]].symbol
            }\n`;
          currentSwapStats[pair] = {};
          for (const asset of assets) {
            const networkFee =
              this.swapPairs[pair][asset].networkFee
                .div(10 ** this.swapPairs[pair][asset].decimals)
                .toString() +
              " " +
              asset;
            const vol =
              this.swapPairs[pair][asset].remainingVolume
                .div(10 ** this.swapPairs[pair][asset].decimals)
                .toString() +
              " " +
              asset;
            swapStats += `      [*] ${this.swapPairs[pair][asset].symbol} :\n       - Network Fee : ${networkFee}\n       - Remaining Volume : ${vol}\n`;
            currentSwapStats[pair][asset] = { networkFee, remainingVol: vol };
          }
        }
        this.logger.warn("current rewards", {
          fees: pureFees,
          conversionData: data[1].conversionData,
          currentSwapStats,
        });
        console.log(
          `\n\n[*]CURRENT STATUS :\n  [!] ACTIVE SWAP COUNT : ${Object.keys(this.swaps).length
          }\n  [!] SWAP REWARD RATE : ${this.reward.toString()} BPS\n  [!] SWAP STATS :\n${swapStats}`
        );
      } catch (err) {
        console.error("[x] ERROR while updating reward: ", err);
        this.logger.error(`error updating rewards`, err);
      }
      if (!runOnce) setTimeout(run, 60000);
    };
    if (!runOnce) setTimeout(run, 60000);
    else await run();
  }

  /**
   * Returns tx fees and reward in bps from fee contract
   */
  async getBotFees() {
    const data = await Promise.all([
      this.clients["tezos"].getFees(),
      this.clients["tezos"].getReward(
        this.swapPairs["usdc/usdtz"]["usdtz"].swapContract
      ),
      this.clients["ethereum"].web3.eth.getGasPrice(),
    ]);
    const ethereumGasPrice = new BigNumber(data[2]);
    return {
      txFees: data[0],
      ethereumGasPrice,
      reward: data[1].reward,
    };
  }

  /**
   * Returns the ethereum and tezos required for swaps of each asset in each pair
   * @param param0 the txFees and ethereum gas price received from `getBotFees()`
   */
  getPureSwapFee({ txFees, ethereumGasPrice }) {
    const pairs = Object.keys(this.swapPairs);
    const pureSwapFees = {};
    for (const pair of pairs) {
      const assets = pair.split("/");
      const initialTxs = {
        [assets[0]]: new BigNumber(
          new BigNumber(txFees[assets[0].toUpperCase()]["initiateWait"])
            .plus(txFees[assets[0].toUpperCase()]["addCounterParty"])
            .multipliedBy(constants.feePad[pair][assets[0]])
            .toFixed(0, 2)
        ),
        [assets[1]]: new BigNumber(
          new BigNumber(txFees[assets[1].toUpperCase()]["initiateWait"])
            .plus(txFees[assets[1].toUpperCase()]["addCounterParty"])
            .multipliedBy(constants.feePad[pair][assets[1]])
            .toFixed(0, 2)
        ),
      };
      const redeemTxs = {
        [assets[0]]: new BigNumber(
          new BigNumber(txFees[assets[1].toUpperCase()]["redeem"])
            .multipliedBy(constants.feePad[pair][assets[0]])
            .toFixed(0, 2)
        ),
        [assets[1]]: new BigNumber(
          new BigNumber(txFees[assets[0].toUpperCase()]["redeem"])
            .multipliedBy(constants.feePad[pair][assets[1]])
            .toFixed(0, 2)
        ),
      };
      pureSwapFees[pair] = {};
      if (this.swapPairs[pair][assets[0]].network === "ethereum") {
        pureSwapFees[pair][assets[0]] = {
          eth: initialTxs[assets[0]].multipliedBy(ethereumGasPrice),
          xtz: new BigNumber(0),
        };
        pureSwapFees[pair][assets[1]] = {
          eth: redeemTxs[assets[1]].multipliedBy(ethereumGasPrice),
          xtz: new BigNumber(0),
        };
      } else {
        pureSwapFees[pair][assets[0]] = {
          xtz: initialTxs[assets[0]],
          eth: new BigNumber(0),
        };
        pureSwapFees[pair][assets[1]] = {
          xtz: redeemTxs[assets[1]],
          eth: new BigNumber(0),
        };
      }
      if (this.swapPairs[pair][assets[1]].network === "ethereum") {
        pureSwapFees[pair][assets[1]] = {
          eth: pureSwapFees[pair][assets[1]].eth.plus(
            initialTxs[assets[1]].multipliedBy(ethereumGasPrice)
          ),
          xtz: pureSwapFees[pair][assets[1]].xtz,
        };
        pureSwapFees[pair][assets[0]] = {
          eth: pureSwapFees[pair][assets[0]].eth.plus(
            redeemTxs[assets[0]].multipliedBy(ethereumGasPrice)
          ),
          xtz: pureSwapFees[pair][assets[0]].xtz,
        };
      } else {
        pureSwapFees[pair][assets[1]] = {
          xtz: pureSwapFees[pair][assets[1]].xtz.plus(initialTxs[assets[1]]),
          eth: pureSwapFees[pair][assets[1]].eth,
        };
        pureSwapFees[pair][assets[0]] = {
          xtz: pureSwapFees[pair][assets[0]].xtz.plus(redeemTxs[assets[0]]),
          eth: pureSwapFees[pair][assets[0]].eth,
        };
      }
    }
    return pureSwapFees;
  }

  /**
   * Calculates the worst case network fees required
   * to swap the complete volume of assets provide to the bot
   */
  async getWorstCaseNetworkFees() {
    const fee = await this.getBotFees();
    const pureFees = this.getPureSwapFee(fee);
    let eth = new BigNumber(0),
      xtz = new BigNumber(0);
    const pairs = Object.keys(this.swapPairs);
    for (const pair of pairs) {
      const assets = pair.split("/");
      for (const asset of assets) {
        const count = this.swapPairs[pair][asset].remainingVolume
          .div(constants.minTradeVolume[pair][asset])
          .toFixed(0, 2);
        eth = eth.plus(pureFees[pair][asset].eth.multipliedBy(count));
        xtz = xtz.plus(pureFees[pair][asset].xtz.multipliedBy(count));
      }
    }
    return { eth, xtz };
  }
  /**
   * Pings tezex server to update live status
   */
  liveUpdate() {
    const run = async () => {
      console.log("[*] LIVE CHECK");
      this.logger.info("ping server");
      try {
        const volume = {};
        const pairs = Object.keys(this.swapPairs);
        for (const pair of pairs) {
          const assets = pair.split("/");
          volume[pair] = {
            [assets[0]]: this.swapPairs[pair][assets[0]].remainingVolume,
            [assets[1]]: this.swapPairs[pair][assets[1]].remainingVolume,
          };
        }
        const res = await fetch(config.tezex.server + config.tezex.route, {
          method: "POST",
          body: JSON.stringify({
            accounts: {
              ethereum: this.clients["ethereum"].account,
              tezos: this.clients["tezos"].account,
            },
            volume,
          }),
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error("Failed to ping server\n");
      } catch (err) {
        console.log(`\n[x] LIVE CHECK ERROR : ${err.toString()}`);
        this.logger.error(`error pinging server`, err);
      }
      setTimeout(run, 60000);
    };
    run();
  }

  /**
   * Checks if a new swap on a particular network can be taken up or not
   *
   * @param type specifies the network of the swap,eg. `ethereum` or `tezos`
   */
  swapPossible(type) {
    const keys = Object.keys(this.swaps);
    let ethSwaps = 0,
      tezSwaps = 0;
    for (const key of keys)
      if (this.swaps[key].state !== STATE.REFUNDED) {
        if (this.swaps[key].network === "ethereum") ethSwaps++;
        else tezSwaps++;
      }
    if (type === "ethereum") return ethSwaps < this.maxEthSwaps;
    return tezSwaps < this.maxTezSwaps;
  }

  /**
   * Returns the balances of all the assets specified in the balance requirements for the current bot account
   *
   * @param balanceRequirements contains all the assets and their volume details
   */
  async getBalances(balanceRequirements) {
    const ops = [];
    const tokens = Object.keys(balanceRequirements);
    for (const token of tokens) {
      if (token !== "eth" && token !== "xtz")
        ops.push(
          this.clients[balanceRequirements[token].network].tokenBalance(
            balanceRequirements[token].contract,
            this.clients[balanceRequirements[token].network].account
          )
        );
    }
    ops.push(
      this.clients["ethereum"].balance(this.clients["ethereum"].account),
      this.clients["tezos"].balance(this.clients["tezos"].account)
    );
    const resp = await Promise.all(ops);
    let i = 0;
    for (const token of tokens) {
      if (token !== "eth" && token !== "xtz") {
        balanceRequirements[token] = {
          ...balanceRequirements[token],
          balance: new BigNumber(resp[i++]),
        };
      }
    }
    balanceRequirements["eth"] = {
      ...balanceRequirements["eth"],
      balance: new BigNumber(resp[i++]),
    };
    balanceRequirements["xtz"] = {
      ...balanceRequirements["xtz"],
      balance: new BigNumber(resp[i++]),
    };
    return balanceRequirements;
  }

  /**
   * returns the asset fee converter and swap pair asset converter.
   * `feeConverter` converts xtz/eth to the particular asset while
   * `assetConverter` converts one asset in a swap pair to the other
   */
  async getConverter() {
    const [eth_usd, xtz_usd, btc_usd] = await Promise.all([
      this.clients["tezos"].getPrice("ETH-USD"),
      this.clients["tezos"].getPrice("XTZ-USD"),
      this.clients["tezos"].getPrice("BTC-USD"),
    ]);
    const feeConverter = {
      wbtc: ({ eth, xtz }) =>
        new BigNumber(
          eth
            .div(10 ** 18)
            .multipliedBy(new BigNumber(eth_usd))
            .plus(xtz.div(10 ** 6).multipliedBy(new BigNumber(xtz_usd)))
            .div(new BigNumber(btc_usd))
            .multipliedBy(10 ** 8)
            .toFixed(0, 2)
        ),
      tzbtc: ({ eth, xtz }) =>
        new BigNumber(
          eth
            .div(10 ** 18)
            .multipliedBy(new BigNumber(eth_usd))
            .plus(xtz.div(10 ** 6).multipliedBy(new BigNumber(xtz_usd)))
            .div(new BigNumber(btc_usd))
            .multipliedBy(10 ** 8)
            .toFixed(0, 2)
        ),
      usdc: ({ eth, xtz }) =>
        new BigNumber(
          eth
            .div(10 ** 18)
            .multipliedBy(new BigNumber(eth_usd))
            .plus(xtz.div(10 ** 6).multipliedBy(new BigNumber(xtz_usd)))
            .toFixed(0, 2)
        ),
      usdtz: ({ eth, xtz }) =>
        new BigNumber(
          eth
            .div(10 ** 18)
            .multipliedBy(new BigNumber(eth_usd))
            .plus(xtz.div(10 ** 6).multipliedBy(new BigNumber(xtz_usd)))
            .toFixed(0, 2)
        ),
      ethtz: ({ eth, xtz }) =>
        new BigNumber(
          eth
            .plus(
              xtz
                .div(10 ** 6)
                .multipliedBy(new BigNumber(xtz_usd))
                .div(new BigNumber(eth_usd))
                .multipliedBy(10 ** 18)
            )
            .toFixed(0, 2)
        ),
      eth: ({ eth, xtz }) =>
        new BigNumber(
          eth
            .plus(
              xtz
                .div(10 ** 6)
                .multipliedBy(new BigNumber(xtz_usd))
                .div(new BigNumber(eth_usd))
                .multipliedBy(10 ** 18)
            )
            .toFixed(0, 2)
        ),
    };
    const assetConverter = {
      "usdc/usdtz": {
        usdc: (amt) => amt,
        usdtz: (amt) => amt,
      },
      "eth/ethtz": {
        eth: (amt) => amt,
        ethtz: (amt) => amt,
      },
      "wbtc/tzbtc": {
        wbtc: (amt) => amt,
        tzbtc: (amt) => amt,
      },
    };
    return {
      conversionData: { eth_usd, xtz_usd },
      feeConverter,
      assetConverter,
    };
  }
};
