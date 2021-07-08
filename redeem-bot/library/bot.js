const config = require(`./${process.env.BOT_ENV || "prod"
  }-network-config.json`);
const Web3 = require("web3");
const { getAssets, getCounterPair } = require("./util");
const { Mutex } = require("async-mutex");
const Ethereum = require("./ethereum");
const Tezos = require("./tezos");

module.exports = class Bot {
  constructor(logger) {
    this.swapPairs = {}; // arranged pair wise (eg. "usdc/usdtz") and contains contract details for the swap pair
    this.logger = logger;
  }

  /**
   * Initiate the tezex bot, configure ethereum and tezos clients and signers
   *
   * @param ethConfig user config for ethereum {walletPK:string}
   * @param tezosConfig user config for tezos {walletPK:string}
   */
  async init(ethConfig, tezosConfig) {
    try {
      console.log("\nInitializing Bot...");
      this.logger.warn("Setting Up Bot");
      const ethMutex = new Mutex();
      const tezMutex = new Mutex();
      const pairs = Object.keys(config.pairs);
      const web3 = new Web3(
        new Web3.providers.HttpProvider(config.ethereum.RPC)
      );
      pairs.forEach((pair) => {
        const assets = getAssets(pair);
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

          this.swapPairs[pair] = {
            ...this.swapPairs[pair],
            [asset]: {
              network: config.pairs[pair][asset].network,
              swapContract: swapContract,
              tokenContract: tokenContract,
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
      return {
        ethAccount: this.clients["ethereum"].account,
        tezosAccount: this.clients["tezos"].account,
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
      console.log(`\n\n[!] INITIALIZING BOT FOR ${process.env.BOT_ENV || "prod"
        } ENV! PLEASE WAIT...\n`);
      const pairs = Object.keys(this.swapPairs);
      for (const pair of pairs) {
        const assets = pair.split("/");
        for (const asset of assets) {
          this.monitorSwaps(pair, asset);
        }
      }
    } catch (err) {
      this.logger.error("bot start failed", err);
      throw err;
    }
  }

  /**
   * Monitors swap requests and responds to suitable swaps for the particular pair & asset combo
   *
   * @param pair valid swap pair eg. "usdc/usdtz"
   * @param counterAsset valid asset from the swap pair eg. usdc from "usdc/usdtz" pair, which wil be monitored
   */
  monitorSwaps(pair, asset) {
    const counterAsset = getCounterPair(pair, asset);
    const counterNetwork = this.swapPairs[pair][counterAsset].network;
    const network = this.swapPairs[pair][asset].network;
    const run = async () => {
      try {
        console.log(
          `[*] CHECKING ${this.swapPairs[pair][asset].symbol} SWAPS`
        );
        this.logger.info(
          `checking ${this.swapPairs[pair][asset].symbol} swaps`
        );
        const redeemableSwaps = await this.clients[network].getRedeemableSwaps(
          this.swapPairs[pair][asset].swapContract
        );
        console.log(redeemableSwaps)
        const keys = Object.keys(redeemableSwaps);
        for (const i of keys) {
          const swp = redeemableSwaps[i];
          const counterSwap = await Promise.all([this.clients[counterNetwork].getSwap(
            this.swapPairs[pair][counterAsset].swapContract,
            swp.hashedSecret
          ),
          this.clients[counterNetwork].getRedeemedSecret(this.swapPairs[pair][counterAsset].swapContract, swp.hashedSecret)]);
          if (
            ((counterNetwork === "tezos" && counterSwap[0] === undefined) ||
              (counterNetwork === "ethereum" &&
                counterSwap[0].initiator_tez_addr === "" &&
                counterSwap[0].refundTimestamp === "0")
            ) && counterSwap[1] !== undefined
          ) {
            console.log(
              `[!] FOUND redeemable ${this.swapPairs[pair][asset].symbol} SWAP: `,
              swp.hashedSecret
            );
            this.logger.warn(
              `found redeemable ${this.swapPairs[pair][counterAsset].symbol} swap`,
              { swap: swp }
            );
            await this.clients[network].redeem(
              this.swapPairs[pair][asset].swapContract,
              swp.hashedSecret,
              counterSwap[1]
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
};
