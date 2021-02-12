const ERC20 = require("./erc20");
const config = require("./network-config.json");
const FA12 = require("./fa12");
const respondEth = require("./common/respond-eth");
const Web3 = require("web3");
const respondTezos = require("./common/respond-tezos");
const { calcSwapReturn } = require("./common/util");
const { constants } = require("./common/util");

module.exports = class Bot {
  constructor() {
    this.usdcSwaps = {}; // list of all usdc swaps being handled
    this.usdtzSwaps = {}; // list of all usdtz swaps being handled
    this.volume = {}; // max volume of token to be traded {usdc:nat, usdtz:nat}
    this.usdcLimit = 5; // max no. of concurrent usdc swaps to undertake
    this.usdtzLimit = 5; // max no. of concurrent usdtz swaps to undertake
    this.reward = 0; // reward for responding to user swaps, taken from tezos contract
    this.usdcTxFee = 0; // tx fee expected for a usdc swap
    this.usdcTxFee = 0; // tx fee expected for a usdtz swap
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
        usdc: parseInt(volume.usdc),
        usdtz: parseInt(volume.usdtz),
      };
      const web3 = new Web3(
        new Web3.providers.HttpProvider(config.ethereum.RPC)
      );
      const swapContract = new web3.eth.Contract(
        config.ethereum.abi,
        config.ethereum.contractAddr
      );
      const tokenContract = new web3.eth.Contract(
        config.ethereum.tokenABI,
        config.ethereum.tokenAddr
      );
      this.usdc = new ERC20(
        web3,
        ethConfig.walletPK,
        config.ethereum.chain,
        swapContract,
        tokenContract
      );
      this.usdtz = new FA12(
        tezosConfig.walletPK,
        config.tezos.swapContract,
        config.tezos.priceOracle,
        config.tezos.feeContract,
        config.tezos.tokenContract,
        config.tezos.chain_id,
        config.tezos.RPC,
        config.tezos.conseilServer
      );
      await this.usdtz.initConseil();
      const ethBalance = await this.usdc.balance(this.usdc.account);
      const usdcBalance = await this.usdc.tokenBalance(this.usdc.account);
      const tezBalance = await this.usdtz.balance(this.usdtz.account);
      const usdtzBalance = await this.usdtz.tokenBalance(this.usdtz.account);
      return {
        eth: {
          account: this.usdc.account,
          balance: this.usdc.web3.utils.fromWei(ethBalance),
          usdc: usdcBalance / constants.decimals10_6,
        },
        tez: {
          account: this.usdtz.account,
          balance: tezBalance / constants.decimals10_6,
          usdtz: usdtzBalance / constants.decimals10_6,
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
    if (allowances[0] != this.volume.usdtz)
      ops.push(this.usdtz.approveToken(this.volume.usdtz));
    if (allowances[1] != this.volume.usdc)
      ops.push(this.usdc.approveToken(this.volume.usdc));
    await Promise.all(ops);
    console.log("\n[!] BOT INITIALIZED");
    await this.monitorReward(true);
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
            this.volume.usdc += parseInt(swap.value);
            const allowance = await this.usdc.tokenAllowance(this.usdc.account);
            if (parseInt(allowance) != this.volume.usdc)
              await this.usdc.approveToken(this.volume.usdc);
          } else {
            delete this.usdtzSwaps[swap.hashedSecret];
            this.volume.usdtz += parseInt(swap.value);
            const allowance = await this.usdtz.tokenAllowance(
              this.usdtz.account
            );
            if (parseInt(allowance) != this.volume.usdtz)
              await this.usdtz.approveToken(this.volume.usdtz);
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
        if (this.volume.usdtz === 0) return;
        const waitingSwaps = await this.usdc.getWaitingSwaps(4200);
        for (const i in waitingSwaps) {
          const swp = waitingSwaps[i];
          if (Object.keys(this.usdtzSwaps).length >= this.usdcLimit) break;
          const existingResponse = await this.usdtz.getSwap(swp.hashedSecret);
          if (
            existingResponse === undefined &&
            this.usdtzSwaps[swp.hashedSecret] === undefined &&
            swp.value > 0 &&
            swp.value <= this.volume.usdtz
          ) {
            console.log("[!] FOUND : ", swp.hashedSecret);
            let valueToPay = calcSwapReturn(swp.value, this.reward);
            if (valueToPay < this.usdtzTxFee) {
              console.log("[x] SWAP NOT PROFITABLE : ", swp.hashedSecret);
              continue;
            }
            valueToPay -= this.usdtzTxFee;
            this.usdtzSwaps[swp.hashedSecret] = {
              state: 0,
              value: valueToPay,
              hashedSecret: swp.hashedSecret,
              refundTime: swp.refundTimestamp - 3600,
            };
            console.log(this.usdtzSwaps, valueToPay);
            this.volume.usdtz -= parseInt(
              this.usdtzSwaps[swp.hashedSecret].value
            );
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
        if (this.volume.usdc === 0) return;
        const waitingSwaps = await this.usdtz.getWaitingSwaps(4200);
        for (const i in waitingSwaps) {
          const swp = waitingSwaps[i];
          if (Object.keys(this.usdcSwaps).length >= this.usdtzLimit) break;
          const existingResponse = await this.usdc.getSwap(swp.hashedSecret);
          if (
            existingResponse.initiator_tez_addr === "" &&
            existingResponse.refundTimestamp === "0" &&
            this.usdcSwaps[swp.hashedSecret] === undefined &&
            swp.value > 0 &&
            swp.value <= this.volume.usdc
          ) {
            console.log("[!] FOUND : ", swp.hashedSecret);
            let valueToPay = calcSwapReturn(swp.value, this.reward);
            if (valueToPay < this.usdcTxFee) {
              console.log("[x] SWAP NOT PROFITABLE : ", swp.hashedSecret);
              continue;
            }
            valueToPay -= this.usdcTxFee;
            this.usdcSwaps[swp.hashedSecret] = {
              state: 0,
              value: valueToPay,
              hashedSecret: swp.hashedSecret,
              refundTime: swp.refundTimestamp - 3600,
            };
            this.volume.usdc -= parseInt(
              this.usdcSwaps[swp.hashedSecret].value
            );
            console.log(this.usdcSwaps, valueToPay);
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
   * Monitors and updates the reward (basis points) value
   */
  async monitorReward(runOnce = false) {
    const run = async () => {
      console.log("[*] UPDATING REWARDS");
      try {
        const data = await Promise.all([
          this.usdtz.getFees(),
          this.usdtz.getPrice("ETH-USD"),
          this.usdtz.getPrice("XTZ-USD"),
          this.usdtz.getReward(),
          this.usdc.web3.eth.getGasPrice(),
        ]);
        this.reward = data[3];
        const usdtzFeeData = data[0]["USDTZ"];
        const usdcFeeData = data[0]["USDC"];
        const ethereumGasPrice = parseFloat(
          this.usdc.web3.utils.fromWei(data[4], "ether")
        );
        this.usdtzTxFee = Math.ceil(
          (((usdtzFeeData["initiateWait"] + usdtzFeeData["addCounterParty"]) *
            data[2]) /
            constants.decimals10_6 +
            usdcFeeData["redeem"] * ethereumGasPrice * data[1]) *
            constants.usdtzFeePad
        );
        this.usdcTxFee = Math.ceil(
          ((usdcFeeData["initiateWait"] + usdcFeeData["addCounterParty"]) *
            ethereumGasPrice *
            data[1] +
            (usdtzFeeData["redeem"] * data[2]) / constants.decimals10_6) *
            constants.usdcFeePad
        );
      } catch (err) {
        console.error("[x] ERROR while updating reward: ", err);
      }
      console.log(
        `\n\n[*]CURRENT STATUS :\n  [!] ACTIVE SWAP COUNT : ${
          Object.keys(this.usdcSwaps).length +
          Object.keys(this.usdtzSwaps).length
        }\n  [!] SWAP REWARD RATE : ${
          this.reward
        } BPS\n  [!] EXPECTED TX FEE REWARD :\n    - USDC SWAP : ${
          this.usdcTxFee / constants.decimals10_6
        } usdc\n    - USDtz SWAP : ${
          this.usdtzTxFee / constants.decimals10_6
        } usdtz\n  [!] REMAINING VOLUME :\n    - USDC : ${
          this.volume.usdc / constants.decimals10_6
        } usdc\n    - USDtz : ${
          this.volume.usdtz / constants.decimals10_6
        } usdtz\n\n`
      );
      if (!runOnce) setTimeout(run, 60000);
    };
    if (!runOnce) setTimeout(run, 60000);
    else await run();
  }
};
