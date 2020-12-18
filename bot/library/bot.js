const USDC = require("./usdc");
const config = require("./network-config.json");
const USDTz = require("./usdtz");
const respondEth = require("./common/respond-eth");
const Web3 = require("web3");
const respondTezos = require("./common/respond-tezos");

module.exports = class Bot {
  constructor() {
    this.usdcSwaps = {};
    this.usdtzSwaps = {};
    this.volume = {};
    this.usdcLimit = 5;
    this.usdtzLimit = 5;
  }
  async init(ethConfig, tezosConfig, volume) {
    try {
      this.volume = volume;
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
      this.usdc = new USDC(
        web3,
        ethConfig.walletAddress,
        ethConfig.walletPK,
        config.ethereum.chain,
        swapContract,
        tokenContract
      );
      this.usdtz = new USDTz(
        tezosConfig.walletAddress,
        tezosConfig.walletPK,
        config.tezos.swapContract,
        config.tezos.tokenContract,
        config.tezos.chain_id,
        config.tezos.RPC,
        config.tezos.conseilServer
      );
      await this.usdtz.initConseil();
      await Promise.all([
        this.usdc.approveToken(this.volume.usdc),
        this.usdtz.approveToken(this.volume.usdtz),
      ]);
      console.log("BOT INITIALIZED");
    } catch (err) {
      console.error("Bot Init failed | ", err);
      throw err;
    }
  }

  start() {
    this.monitorUSDC();
    this.monitorUSDTz();
    this.monitorRefunds();
    console.log("BOT MONITORING");
  }

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
          console.error("FAILED TO RE-APPROVE FUNDS");
        }
        break;
      }
      default: {
        if (type === 2) this.usdcSwaps[swap.hashedSecret] = swap;
        else this.usdtzSwaps[swap.hashedSecret] = swap;
      }
    }
    console.log("details", this.usdcSwaps, this.usdtzSwaps, this.volume);
  }

  monitorRefunds() {
    const run = async () => {
      console.log("CHECKING REFUNDABLE SWAPS");
      for (const key in this.usdcSwaps) {
        if (
          this.usdcSwaps[key].state === 4 &&
          this.usdcSwaps[key].refundTime <= Date.now() / 1000
        ) {
          try {
            await this.usdc.refund(key);
            this.usdcSwaps[key].state = 3;
            await this.updateSwap(2, this.usdcSwaps[key]);
            console.log("REFUNDED SWAP(USDC): ", key);
          } catch (err) {
            console.error("FAILED TO REFUND SWAP(USDC): ", key);
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
            console.log("REFUNDED SWAP(USDTz): ", key);
          } catch (err) {
            console.error("FAILED TO REFUND SWAP(USDTz): ", key);
          }
        }
      }
      setTimeout(run, 120000);
    };
    setTimeout(run, 0);
  }

  monitorUSDC() {
    const run = async () => {
      try {
        console.log("CHECKING USDC SWAPS");
        if (this.volume.usdtz === 0) return;
        const waitingSwaps = await this.usdc.getWaitingSwaps(4200);
        console.log(waitingSwaps);
        for (const i in waitingSwaps) {
          const swp = waitingSwaps[i];
          console.log("usdc", Object.keys(this.usdtzSwaps).length);
          if (Object.keys(this.usdtzSwaps).length >= this.usdcLimit) break;
          const existingResponse = await this.usdtz.getSwap(swp.hashedSecret);
          if (
            existingResponse === undefined &&
            this.usdtzSwaps[swp.hashedSecret] === undefined &&
            swp.value > 0 &&
            swp.value <= this.volume.usdtz
          ) {
            console.log("FOUND : ", swp.hashedSecret);
            this.usdtzSwaps[swp.hashedSecret] = {
              state: 0,
              value: swp.value,
              hashedSecret: swp.hashedSecret,
              refundTime: swp.refundTimestamp - 3600,
            };
            //   console.log(this.usdtzSwaps[swp.hashedSecret]);
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
        console.error("FAILED TO MONITOR USDC SWAPS | ", err);
      }
      setTimeout(run, 120000);
    };
    setTimeout(run, 0);
  }

  monitorUSDTz() {
    const run = async () => {
      try {
        console.log("CHECKING USDTz SWAPS");
        if (this.volume.usdc === 0) return;
        const waitingSwaps = await this.usdtz.getWaitingSwaps(4200);
        console.log(waitingSwaps);
        for (const i in waitingSwaps) {
          const swp = waitingSwaps[i];
          console.log("usdtz", Object.keys(this.usdcSwaps).length);
          if (Object.keys(this.usdcSwaps).length >= this.usdtzLimit) break;
          const existingResponse = await this.usdc.getSwap(swp.hashedSecret);
          if (
            existingResponse.initiator_tez === "" &&
            existingResponse.refundTimestamp === "0" &&
            this.usdcSwaps[swp.hashedSecret] === undefined &&
            swp.value > 0 &&
            swp.value <= this.volume.usdc
          ) {
            console.log("FOUND : ", swp.hashedSecret);
            this.usdcSwaps[swp.hashedSecret] = {
              state: 0,
              value: swp.value,
              hashedSecret: swp.hashedSecret,
              refundTime: swp.refundTimestamp - 3600,
            };
            this.volume.usdc -= parseInt(
              this.usdcSwaps[swp.hashedSecret].value
            );
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
        console.error("FAILED TO MONITOR USDTz SWAPS | ", err);
      }
      setTimeout(run, 120000);
    };
    setTimeout(run, 0);
  }
};
