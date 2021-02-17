const express = require("express");
const Ethereum = require("./library/ethereum");
const Tezos = require("./library/tezos");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 8000;
const bots = {};
const maxInactiveTime = 180000; // time in milliseconds

const ethClient = Ethereum.newClient();
const tezClient = Tezos.newClient("error");

app.use(express.json());
app.use(cors());

app.post("/bot/ping", async (req, res) => {
  try {
    const { ethAddr, tezAddr } = req.body;
    if (ethAddr === undefined || ethAddr === "") {
      return res.status(400).json({ error: "Invalid Ethereum Address" });
    }
    if (tezAddr === undefined || tezAddr === "") {
      return res.status(400).json({ error: "Invalid Tezos Address" });
    }
    const id = ethAddr + tezAddr;
    const [ethAllowance, tezAllowance] = await Promise.all([
      ethClient.tokenAllowance(ethAddr),
      tezClient.tokenAllowance(tezAddr),
    ]);
    if (BigInt(ethAllowance) === 0n && BigInt(tezAllowance) === 0n) {
      return res.status(400).json({ error: "No allowance found" });
    }
    bots[id] = {
      ethAddr,
      tezAddr,
      ethAllowance: BigInt(ethAllowance),
      tezAllowance: BigInt(tezAllowance),
      lastSeen: new Date().getTime(),
    };
    return res.status(200).json({ success: "ok" });
  } catch (err) {
    console.log(`[x] ERROR : ${err.toString()}`);
    return res.status(500).json({ error: err.toString() });
  }
});

app.get("/client/status", (req, res, next) => {
  try {
    const botData = Object.values(bots);
    let maxUSDtz = 0n,
      maxUSDC = 0n,
      totalUSDC = 0n,
      totalUSDtz = 0n,
      count = 0;
    const currentTime = new Date().getTime();
    botData.forEach((data) => {
      if (data.lastSeen + maxInactiveTime <= currentTime) {
        return;
      }
      count++;
      if (data.ethAllowance > maxUSDC) maxUSDC = data.ethAllowance;
      if (data.tezAllowance > maxUSDtz) maxUSDtz = data.tezAllowance;
      totalUSDC += data.ethAllowance;
      totalUSDtz += data.tezAllowance;
    });
    res.status(200).json({
      maxUSDC: maxUSDC.toString(),
      maxUSDtz: maxUSDtz.toString(),
      totalUSDC: totalUSDC.toString(),
      totalUSDtz: totalUSDtz.toString(),
      activeBots: count,
    });
  } catch (err) {
    next(err);
  }
});

app.listen(port, () => {
  console.log(`Tezex Server listening on port ${port}!`);
});
