const config = require(`./${process.env.BOT_ENV || "prod"
  }-network-config.json`);

const fetch = require("node-fetch");
const { BigNumber } = require("bignumber.js");
const { Mutex } = require("async-mutex");
const { constants } = require("./util");
const { calcSwapReturn, getAssets, getCounterPair, STATE } = require("./util");
const Tezos = require("./tezos");

module.exports = class Bot {
  constructor(logger) {
    this.reward = 0; // reward for responding to user swaps, taken from tezos contract
    this.maxTezSwaps = 5; // max swaps than can be ran in parallel on tezos network
    this.swapPairs = {}; // arranged pair wise (eg. "usdc/usdtz") and contains contract details, fee details and volume stats for the swap pair
    this.ignored = {}; // list of all swaps from any pair, each swap besides it's common attributes will have a `pair` and a `side` param to identify which pair and side the swap belongs to
    this.swapContract = {}; // swap contract details
    this.logger = logger;
  }

  /**
   * Initiate the tezex bot, configure tezos clients and signers
   *
   * @param tezosConfig user config for tezos {walletPK:string}
   * @param volume max volume of assets to be traded for each pair
   */
  async init(tezosConfig, volume) {
    try {
      console.log("\nInitializing Bot...");
      this.logger.warn("Setting Up Bot");
      const tezMutex = new Mutex();
      const { pairs } = config;
      this.swapContract = config.tezos.swapContract;
      const balanceRequirements = {
        xtz: {
          symbol: "XTZ",
          decimals: 6,
          contract: undefined,
          need: new BigNumber(0),
        },
      };
      pairs.forEach((pair) => {
        const assets = getAssets(pair);
        if (Object.prototype.hasOwnProperty.call(volume, pair)) {
          for (const asset of assets) {
            volume[pair][asset] = new BigNumber(
              new BigNumber(volume[pair][asset])
                .multipliedBy(10 ** config.assets[asset].decimals)
                .toFixed(0, 3)
            );
            if (
              !Object.prototype.hasOwnProperty.call(balanceRequirements, asset)
            ) {
              balanceRequirements[asset] = {
                symbol: config.assets[asset].symbol,
                decimals: config.assets[asset].decimals,
                contract: config.assets[asset].tokenContract,
                need: volume[pair][asset],
              };
            } else {
              balanceRequirements[asset].need = balanceRequirements[
                asset
              ].need.plus(volume[pair][asset]);
            }
            this.swapPairs[pair] = {
              ...this.swapPairs[pair],
              [asset]: {
                tokenContract: config.assets[asset].tokenContract,
                remainingVolume: volume[pair][asset],
                decimals: config.assets[asset].decimals,
                symbol: config.assets[asset].symbol,
                tolerance: volume[pair].tolerance,
              },
            };
          }
        }
      });
      this.client = new Tezos(
        tezosConfig.walletPK,
        config.tezos.priceOracle,
        config.tezos.chain_id,
        config.tezos.RPC,
        config.tezos.conseilServer,
        tezMutex
      );
      await this.client.initConseil();
      const data = await Promise.all([
        this.getBalances(balanceRequirements),
        this.getWorstCaseNetworkFees(),
      ]);
      this.logger.warn("start volume", volume);
      return {
        tezosAccount: this.client.account,
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
      const allowanceCheck = [];
      const assets = Object.keys(config.assets);
      for (const asset of assets) {
        if (asset !== "xtz") {
          allowanceCheck.push(
            this.client.tokenAllowance(
              config.assets[asset].tokenContract,
              this.swapContract,
              this.client.account
            )
          );
        }
      }
      const allowances = await Promise.all(allowanceCheck);
      const approveOps = [];
      let i = 0;
      const tempAssetVol = {};
      for (const pair of config.pairs) {
        const assets = pair.split("/");
        for (const asset of assets) {
          if (asset !== "xtz") {
            if (Object.prototype.hasOwnProperty.call(tempAssetVol, asset))
              tempAssetVol[asset] = tempAssetVol[asset].plus(
                this.swapPairs[pair][asset].remainingVolume
              );
            else
              tempAssetVol[asset] = this.swapPairs[pair][asset].remainingVolume;
          }
        }
      }
      for (const asset of assets) {
        if (
          asset !== "xtz" &&
          !new BigNumber(allowances[i]).eq(tempAssetVol[asset])
        ) {
          this.logger.warn(
            `mismatch for ${asset} : ${allowances[i]} ${tempAssetVol[
              asset
            ].toString()}`
          );
          approveOps.push(
            this.client.approveToken(
              config.assets[asset].tokenContract,
              this.swapContract,
              tempAssetVol[asset].toString()
            )
          );
        }
        i++;
      }
      await Promise.all(approveOps);
      console.log("\n[!] BOT INITIALIZED");
      await this.monitorReward(true);
      this.liveUpdate();
      this.monitorReward();
      this.monitorSwaps();
    } catch (err) {
      this.logger.error("bot start failed", err);
      throw err;
    }
  }

  /**
   * Monitors swap requests and responds to suitable swaps for the particular pair & asset combo
   */
  monitorSwaps() {
    const run = async () => {
      try {
        console.log(`[*] CHECKING SWAPS`);
        this.logger.info(`checking swaps`);
        const waitingSwaps = await this.client.getWaitingSwaps(
          this.swapContract,
          240
        );
        const keys = Object.keys(waitingSwaps);
        for (const i of keys) {
          const swp = waitingSwaps[i];
          console.log(swp);
          try {
            const counterAsset = getCounterPair(swp.pair, swp.asset);
            if (
              Object.prototype.hasOwnProperty.call(this.swapPairs, swp.pair) &&
              new BigNumber(swp.value).gt(0) &&
              new BigNumber(swp.expectedValue).lte(
                this.swapPairs[swp.pair][counterAsset].remainingVolume
              )
            ) {
              console.log(
                `[!] FOUND ${this.swapPairs[swp.pair][counterAsset].symbol
                } SWAP: `,
                swp.hashedSecret
              );
              this.logger.warn(
                `found ${this.swapPairs[swp.pair][counterAsset].symbol} swap`,
                { swap: swp }
              );
              let valueToPay = new BigNumber(
                calcSwapReturn(swp.value, this.reward)
              );
              // convert to counter asset
              valueToPay = this.assetConverter[swp.pair][counterAsset](
                valueToPay
              );
              // check if swap expected value in current limits
              if (valueToPay.lt(new BigNumber(swp.expectedValue))) {
                console.log("less", valueToPay.toString(), swp.expectedValue);
                const diffPercent = new BigNumber(swp.expectedValue)
                  .minus(valueToPay)
                  .div(valueToPay)
                  .multipliedBy(100);
                if (
                  diffPercent.gt(
                    new BigNumber(
                      this.swapPairs[swp.pair][counterAsset].tolerance
                    )
                  )
                ) {
                  // swap is not profitable
                  if (
                    !Object.prototype.hasOwnProperty.call(
                      this.ignored,
                      swp.hashedSecret
                    )
                  ) {
                    console.log("[x] SWAP NOT PROFITABLE : ", swp.hashedSecret);
                    this.logger.warn(
                      `${this.swapPairs[swp.pair][counterAsset].symbol
                      } swap not profitable`,
                      { swap: swp }
                    );
                    this.ignored[swp.hashedSecret] = true;
                  }
                  continue;
                }
              }
              // if older ignored swap is profitable now remove from ignored list
              if (
                Object.prototype.hasOwnProperty.call(this.ignored, swp.hashedSecret)
              ) {
                delete this.ignored[swp.hashedSecret];
              }
              const mutez = counterAsset === "xtz" ? swp.expectedValue : 0;
              await this.client.take(
                this.swapContract,
                swp.hashedSecret,
                swp.pair,
                counterAsset,
                swp.expectedValue,
                mutez
              );
              this.swapPairs[swp.pair][
                counterAsset
              ].remainingVolume = this.swapPairs[swp.pair][
                counterAsset
              ].remainingVolume.minus(swp.expectedValue);

              console.log("[!] SWAP COMPELTED : ", swp.hashedSecret);
              this.logger.warn(
                `${this.swapPairs[swp.pair][counterAsset].symbol
                } swap compelted`,
                { swap: swp }
              );
            }
          } catch (err) {
            console.error(
              `[x] FAILED TO COMPELTE SWAP | ${swp.pair} ${swp.asset} ${swp.hashedSecret}\n`,
              err
            );
            this.logger.error(
              `failed to complete swap | ${swp.pair} ${swp.asset} ${swp.hashedSecret}`,
              err
            );
          }
        }
      } catch (err) {
        console.error(`[x] FAILED TO MONITOR SWAPS\n`, err);
        this.logger.error(`failed to monitor swaps`, err);
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
      this.logger.info("updating rewards");
      try {
        const data = await Promise.all([
          this.getBotFees(),
          this.getConverter(),
        ]);
        const pureFees = this.getPureSwapFee();
        const pairs = Object.keys(this.swapPairs);
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
            const vol = `${this.swapPairs[pair][asset].remainingVolume
              .div(10 ** this.swapPairs[pair][asset].decimals)
              .toString()} ${asset}`;
            swapStats += `      [*] ${this.swapPairs[pair][asset].symbol} :\n       - Remaining Volume : ${vol}\n`;
            currentSwapStats[pair][asset] = { remainingVol: vol };
          }
        }
        this.logger.warn("current rewards", {
          fees: pureFees,
          conversionData: data[1].conversionData,
          currentSwapStats,
        });
        console.log(
          `\n\n[*]CURRENT STATUS :\n  [!] SWAP REWARD RATE : ${this.reward.toString()} BPS\n  [!] SWAP STATS :\n${swapStats}`
        );
      } catch (err) {
        console.error("[x] ERROR while updating reward: ", err);
        this.logger.error("error updating rewards", err);
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
    return await this.client.getReward(this.swapContract);
  }

  /**
   * Returns tez required for swaps of each asset in each pair
   * @param param0 the txFees and ethereum gas price received from `getBotFees()`
   */
  getPureSwapFee() {
    return new BigNumber(0.1);
  }

  /**
   * Calculates the worst case network fees required
   * to swap the complete volume of assets provide to the bot
   */
  async getWorstCaseNetworkFees() {
    const pureFees = this.getPureSwapFee();
    let xtz = new BigNumber(0);
    const pairs = Object.keys(this.swapPairs);
    for (const pair of pairs) {
      const assets = pair.split("/");
      for (const asset of assets) {
        const count = this.swapPairs[pair][asset].remainingVolume
          .div(constants.minTradeVolume[pair][asset])
          .toFixed(0, 2);
        xtz = xtz.plus(pureFees.multipliedBy(count));
      }
    }
    return xtz;
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
              tezos: this.client.account,
            },
            volume,
          }),
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error("Failed to ping server\n");
      } catch (err) {
        console.log(`\n[x] LIVE CHECK ERROR : ${err.toString()}`);
        this.logger.error("error pinging server", err);
      }
      setTimeout(run, 60000);
    };
    run();
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
      if (token !== "xtz") {
        ops.push(
          this.client.tokenBalance(
            balanceRequirements[token].contract,
            this.client.account
          )
        );
      }
    }
    ops.push(this.client.balance(this.client.account));
    const resp = await Promise.all(ops);
    let i = 0;
    for (const token of tokens) {
      if (token !== "xtz") {
        balanceRequirements[token] = {
          ...balanceRequirements[token],
          balance: new BigNumber(resp[i++]),
        };
      }
    }
    balanceRequirements.xtz = {
      ...balanceRequirements.xtz,
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
    //recieved in usd*10^6
    const [eth_usd, xtz_usd] = await Promise.all([
      this.client.getPrice("ETH-USD"),
      this.client.getPrice("XTZ-USD"),
    ]);
    const assetConverter = {
      "xtz/usdtz": {
        xtz: (amt) =>
          new BigNumber(
            amt
              .multipliedBy(10 ** 6)
              .div(new BigNumber(xtz_usd))
              .toFixed(0, 2)
          ),
        usdtz: (amt) =>
          new BigNumber(
            amt
              .div(10 ** 6)
              .multipliedBy(new BigNumber(xtz_usd))
              .toFixed(0, 2)
          ),
      },
      "xtz/ethtz": {
        xtz: (amt) =>
          new BigNumber(
            amt
              .div(10 ** 18)
              .multipliedBy(new BigNumber(eth_usd))
              .div(new BigNumber(xtz_usd))
              .multipliedBy(10 ** 6)
              .toFixed(0, 2)
          ),
        ethtz: (amt) =>
          new BigNumber(
            amt
              .div(10 ** 6)
              .multipliedBy(new BigNumber(xtz_usd))
              .div(new BigNumber(eth_usd))
              .multipliedBy(10 ** 18)
              .toFixed(0, 2)
          ),
      },
      "ethtz/usdtz": {
        ethtz: (amt) =>
          new BigNumber(
            amt
              .multipliedBy(10 ** 18)
              .div(new BigNumber(eth_usd))
              .toFixed(0, 2)
          ),
        usdtz: (amt) =>
          new BigNumber(
            amt
              .div(10 ** 18)
              .multipliedBy(new BigNumber(eth_usd))
              .toFixed(0, 2)
          ),
      },
    };
    return {
      conversionData: { eth_usd, xtz_usd },
      assetConverter,
    };
  }
};
