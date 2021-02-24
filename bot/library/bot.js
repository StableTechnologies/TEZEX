const ERC20 = require("./erc20");
const config = require("./network-config.json");
const FA12 = require("./fa12");
const respondEth = require("./common/respond-eth");
const Web3 = require("web3");
const respondTezos = require("./common/respond-tezos");
const { calcSwapReturn } = require("./common/util");
const { constants } = require("./common/util");
const fetch = require("node-fetch");
const { BigNumber } = require("bignumber.js");

module.exports = class Bot {
  constructor() {
    this.usdcSwaps = {}; // list of all usdc swaps being handled
    this.usdtzSwaps = {}; // list of all usdtz swaps being handled
    this.volume = {}; // max volume of token to be traded {usdc:nat, usdtz:nat}
    this.usdcLimit = 5; // max no. of concurrent usdc swaps to undertake
    this.usdtzLimit = 5; // max no. of concurrent usdtz swaps to undertake
    this.reward = 0; // reward for responding to user swaps, taken from tezos contract
    this.usdcTxFee = 0; // tx fee expected for a usdc swap
    this.usdtzTxFee = 0; // tx fee expected for a usdtz swap
  }

  /**
   * Initiate the tezex bot, configure ethereum and tezos clients and signers
   *
   * @param ethConfig user config for ethereum {walletAddress:string, walletPK:string}
   * @param tezosConfig user config for tezos {walletAddress:string, walletPK:string}
   * @param volume max volume of token to be traded {usdc:nat, usdtz:nat}
   */
  async init(ethConfig, tezosConfig, volume) {
    try {
      console.log("\nInitializing Bot...");
      this.volume = {
        usdc: new BigNumber(volume.usdc),
        usdtz: new BigNumber(volume.usdtz),
      };
      const web3 = new Web3(
        new Web3.providers.HttpProvider(config.ethereum.RPC)
      );
      const usdcSwapContract = new web3.eth.Contract(
        config.pairs["usdc/usdtz"].usdc.swapContract.abi,
        config.pairs["usdc/usdtz"].usdc.swapContract.address
      );
      const usdcTokenContract = new web3.eth.Contract(
        config.pairs["usdc/usdtz"].usdc.tokenContract.abi,
        config.pairs["usdc/usdtz"].usdc.tokenContract.address
      );
      this.usdc = new ERC20(
        web3,
        ethConfig.walletPK,
        config.ethereum.chain,
        usdcSwapContract,
        usdcTokenContract
      );
      this.usdtz = new FA12(
        tezosConfig.walletPK,
        config.pairs["usdc/usdtz"].usdtz.swapContract,
        config.tezos.priceOracle,
        config.tezos.feeContract,
        config.pairs["usdc/usdtz"].usdtz.tokenContract,
        config.tezos.chain_id,
        config.tezos.RPC,
        config.tezos.conseilServer
      );
      await this.usdtz.initConseil();
      const [
        ethBalance,
        usdcBalance,
        tezBalance,
        usdtzBalance,
      ] = await Promise.all([
        this.usdc.balance(this.usdc.account),
        this.usdc.tokenBalance(this.usdc.account),
        this.usdtz.balance(this.usdtz.account),
        this.usdtz.tokenBalance(this.usdtz.account),
      ]);
      const fee = await this.getBotFees();
      return {
        fee,
        eth: {
          account: this.usdc.account,
          balance: this.usdc.web3.utils.fromWei(ethBalance),
          usdc: usdcBalance,
        },
        tez: {
          account: this.usdtz.account,
          balance: new BigNumber(tezBalance)
            .div(constants.decimals10_6)
            .toString(),
          usdtz: usdtzBalance,
        },
      };
    } catch (err) {
      console.error("Bot Init failed | ", err);
      throw err;
    }
  }

  /**
   * Starts the bot and launches concurrent threads for monitoring swaps on both
   * ethereum and tezos networks as well as threads for refunding swaps and
   * updating reward
   */
  async start() {
    console.log("\n\n[!] INITIALIZING BOT! PLEASE WAIT...\n");
    const allowances = await Promise.all([
      this.usdtz.tokenAllowance(this.usdtz.account),
      this.usdc.tokenAllowance(this.usdc.account),
    ]);
    let ops = [];
    if (!new BigNumber(allowances[0]).eq(this.volume.usdtz))
      ops.push(this.usdtz.approveToken(this.volume.usdtz.toString()));
    if (!new BigNumber(allowances[1]).eq(this.volume.usdc))
      ops.push(this.usdc.approveToken(this.volume.usdc.toString()));
    await Promise.all(ops);
    console.log("\n[!] BOT INITIALIZED");
    await this.monitorReward(true);
    this.liveUpdate();
    this.monitorReward();
    this.monitorUSDC();
    this.monitorUSDtz();
    this.monitorRefunds();
  }

  /**
   * Updates the state of the swap and deletes the swap if it has been cancelled
   *
   * @param type specifies whether it is a ethereum(2) or tezos(1) swap
   * @param swap the swap object
   */
  async updateSwap(type, swap) {
    switch (swap.state) {
      case 0: {
        if (type === 2) delete this.usdcSwaps[swap.hashedSecret];
        else delete this.usdtzSwaps[swap.hashedSecret];
        break;
      }
      case 3: {
        try {
          if (type === 2) {
            delete this.usdcSwaps[swap.hashedSecret];
            this.volume.usdc = this.volume.usdc.plus(swap.value);
            const allowance = await this.usdc.tokenAllowance(this.usdc.account);
            if (!new BigNumber(allowance).eq(this.volume.usdc))
              await this.usdc.approveToken(this.volume.usdc.toString());
          } else {
            delete this.usdtzSwaps[swap.hashedSecret];
            this.volume.usdtz += parseInt(swap.value);
            const allowance = await this.usdtz.tokenAllowance(
              this.usdtz.account
            );
            if (!new BigNumber(allowance).eq(this.volume.usdtz))
              await this.usdtz.approveToken(this.volume.usdtz.toString());
          }
        } catch (err) {
          console.error("[x] FAILED TO RE-APPROVE FUNDS");
        }
        break;
      }
      default: {
        if (type === 2) this.usdcSwaps[swap.hashedSecret] = swap;
        else this.usdtzSwaps[swap.hashedSecret] = swap;
      }
    }
  }

  /**
   * Monitors and refunds all cancelled/error swaps
   */
  monitorRefunds() {
    const run = async () => {
      console.log("[*] CHECKING REFUNDABLE SWAPS");
      for (const key in this.usdcSwaps) {
        if (
          this.usdcSwaps[key].state === 4 &&
          this.usdcSwaps[key].refundTime <= Date.now() / 1000
        ) {
          try {
            await this.usdc.refund(key);
            this.usdcSwaps[key].state = 3;
            await this.updateSwap(2, this.usdcSwaps[key]);
            console.log("[!] REFUNDED SWAP(USDC): ", key);
          } catch (err) {
            console.error("[x] FAILED TO REFUND SWAP(USDC): ", key);
          }
        }
      }
      for (const key in this.usdtzSwaps) {
        if (
          this.usdtzSwaps[key].state === 4 &&
          this.usdtzSwaps[key].refundTime <= Date.now() / 1000
        ) {
          try {
            await this.usdtz.refund(key);
            this.usdtzSwaps[key].state = 3;
            await this.updateSwap(1, this.usdtzSwaps[key]);
            console.log("[!] REFUNDED SWAP(USDtz): ", key);
          } catch (err) {
            console.error("[x] FAILED TO REFUND SWAP(USDtz): ", key);
          }
        }
      }
      setTimeout(run, 120000);
    };
    setTimeout(run, 0);
  }

  /**
   * Monitors swaps on the usdc/ethereum network and responds to suitable swaps
   */
  monitorUSDC() {
    const run = async () => {
      try {
        console.log("[*] CHECKING USDC SWAPS");
        if (this.volume.usdtz.eq(0)) return;
        const waitingSwaps = await this.usdc.getWaitingSwaps(4200);
        for (const i in waitingSwaps) {
          const swp = waitingSwaps[i];
          if (Object.keys(this.usdtzSwaps).length >= this.usdcLimit) break;
          const existingResponse = await this.usdtz.getSwap(swp.hashedSecret);
          if (
            existingResponse === undefined &&
            this.usdtzSwaps[swp.hashedSecret] === undefined &&
            new BigNumber(swp.value).gt(0) &&
            new BigNumber(swp.value).lte(this.volume.usdtz)
          ) {
            console.log("[!] FOUND : ", swp.hashedSecret);
            let valueToPay = new BigNumber(
              calcSwapReturn(swp.value, this.reward)
            );
            if (valueToPay.lt(this.usdtzTxFee)) {
              console.log("[x] SWAP NOT PROFITABLE : ", swp.hashedSecret);
              continue;
            }
            valueToPay = valueToPay.minus(this.usdtzTxFee);
            this.usdtzSwaps[swp.hashedSecret] = {
              state: 0,
              value: valueToPay.toString(),
              hashedSecret: swp.hashedSecret,
              refundTime: swp.refundTimestamp - 3600,
            };
            console.log(this.usdtzSwaps, valueToPay.toString());
            this.volume.usdtz = this.volume.usdtz.minus(valueToPay);
            respondEth(
              this.usdc,
              this.usdtz,
              this.usdtzSwaps[swp.hashedSecret],
              this,
              0
            );
          }
        }
      } catch (err) {
        console.error("[x] FAILED TO MONITOR USDC SWAPS | ", err);
      }
      setTimeout(run, 120000);
    };
    setTimeout(run, 0);
  }

  /**
   * Monitors swaps on the usdtz/tezos network and responds to suitable swaps
   */
  monitorUSDtz() {
    const run = async () => {
      try {
        console.log("[*] CHECKING USDtz SWAPS");
        if (this.volume.usdc.eq(0)) return;
        const waitingSwaps = await this.usdtz.getWaitingSwaps(4200);
        for (const i in waitingSwaps) {
          const swp = waitingSwaps[i];
          if (Object.keys(this.usdcSwaps).length >= this.usdtzLimit) break;
          const existingResponse = await this.usdc.getSwap(swp.hashedSecret);
          if (
            existingResponse.initiator_tez_addr === "" &&
            existingResponse.refundTimestamp === "0" &&
            this.usdcSwaps[swp.hashedSecret] === undefined &&
            new BigNumber(swp.value).gt(0) &&
            new BigNumber(swp.value).lte(this.volume.usdc)
          ) {
            console.log("[!] FOUND : ", swp.hashedSecret);
            let valueToPay = new BigNumber(
              calcSwapReturn(swp.value, this.reward)
            );
            if (valueToPay.lt(this.usdcTxFee)) {
              console.log("[x] SWAP NOT PROFITABLE : ", swp.hashedSecret);
              continue;
            }
            valueToPay = valueToPay.minus(this.usdcTxFee);
            this.usdcSwaps[swp.hashedSecret] = {
              state: 0,
              value: valueToPay.toString(),
              hashedSecret: swp.hashedSecret,
              refundTime: swp.refundTimestamp - 3600,
            };
            this.volume.usdc = this.volume.usdc.minus(valueToPay);
            console.log(this.usdcSwaps, valueToPay.toString());
            respondTezos(
              this.usdc,
              this.usdtz,
              this.usdcSwaps[swp.hashedSecret],
              this,
              0
            );
          }
        }
      } catch (err) {
        console.error("[x] FAILED TO MONITOR USDtz SWAPS | ", err);
      }
      setTimeout(run, 120000);
    };
    setTimeout(run, 0);
  }

  /**
   * Monitors and updates the reward (basis points) value and tx fees
   */
  async monitorReward(runOnce = false) {
    const run = async () => {
      console.log("[*] UPDATING REWARDS");
      try {
        const data = await Promise.all([
          this.getBotFees(),
          this.usdtz.getPrice("ETH-USD"),
          this.usdtz.getPrice("XTZ-USD"),
        ]);
        const { usdtzFeeData, usdcFeeData, ethereumGasPrice, reward } = data[0];
        this.reward = reward;
        this.usdtzTxFee = new BigNumber(
          usdtzFeeData["initiateWait"] + usdtzFeeData["addCounterParty"]
        )
          .multipliedBy(data[2])
          .div(constants.decimals10_6)
          .plus(
            new BigNumber(usdcFeeData["redeem"])
              .multipliedBy(ethereumGasPrice)
              .multipliedBy(data[1])
          )
          .multipliedBy(constants.usdtzFeePad)
          .toFixed(0, 2);
        this.usdcTxFee = new BigNumber(
          usdcFeeData["initiateWait"] + usdcFeeData["addCounterParty"]
        )
          .multipliedBy(ethereumGasPrice)
          .multipliedBy(data[1])
          .plus(
            new BigNumber(usdtzFeeData["redeem"])
              .multipliedBy(data[2])
              .div(constants.decimals10_6)
          )
          .multipliedBy(constants.usdcFeePad)
          .toFixed(0, 2);
      } catch (err) {
        console.error("[x] ERROR while updating reward: ", err);
      }
      console.log(
        `\n\n[*]CURRENT STATUS :\n  [!] ACTIVE SWAP COUNT : ${
          Object.keys(this.usdcSwaps).length +
          Object.keys(this.usdtzSwaps).length
        }\n  [!] SWAP REWARD RATE : ${
          this.reward
        } BPS\n  [!] EXPECTED TX FEE REWARD :\n    - USDC SWAP : ${new BigNumber(
          this.usdcTxFee
        )
          .div(constants.decimals10_6)
          .toString()} usdc\n    - USDtz SWAP : ${new BigNumber(this.usdtzTxFee)
          .div(constants.decimals10_6)
          .toString()} usdtz\n  [!] REMAINING VOLUME :\n    - USDC : ${this.volume.usdc
          .div(constants.decimals10_6)
          .toString()} usdc\n    - USDtz : ${this.volume.usdtz
          .div(constants.decimals10_6)
          .toString()} usdtz\n\n`
      );
      if (!runOnce) setTimeout(run, 60000);
    };
    if (!runOnce) setTimeout(run, 60000);
    else await run();
  }
  /**
   * Returns tx fees and reward in bps
   */
  async getBotFees() {
    const data = await Promise.all([
      this.usdtz.getFees(),
      this.usdtz.getReward(),
      this.usdc.web3.eth.getGasPrice(),
    ]);
    const usdtzFeeData = data[0]["USDTZ"];
    const usdcFeeData = data[0]["USDC"];
    const ethereumGasPrice = new BigNumber(
      this.usdc.web3.utils.fromWei(data[2], "ether")
    );
    return {
      usdtzFeeData,
      usdcFeeData,
      ethereumGasPrice,
      reward: data[1],
    };
  }

  /**
   * Pings tezex server to update live status
   */
  liveUpdate() {
    const run = async () => {
      console.log("[*] LIVE CHECK");
      try {
        const res = await fetch(config.tezex.server + config.tezex.route, {
          method: "POST",
          body: JSON.stringify({
            ethAddr: this.usdc.account,
            tezAddr: this.usdtz.account,
          }),
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error("Failed to ping server\n");
      } catch (err) {
        console.log(`\n[x] ERROR : ${err.toString()}`);
      }
      setTimeout(run, 60000);
    };
    setTimeout(run, 0);
  }
};
