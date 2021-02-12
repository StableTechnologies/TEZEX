const { Mutex } = require("async-mutex");
const { v4: uuid } = require("uuid");

const express = require("express");
const Ethereum = require("./library/ethereum");
const Tezos = require("./library/tezos");
const app = express();
const port = process.env.PORT || 8000;

const bots = {};
const ethAddrs = {};
const tezAddrs = {};

const maxInactiveTime = 30000; // time in milliseconds

const mutex = new Mutex();
const ethClient = Ethereum.newClient();
const tezClient = Tezos.newClient("error");
app.use(express.json());

app.post("/bot/init", async (req, res, next) => {
  const release = await mutex.acquire();
  try {
    const { ethAddr, tezAddr } = req.body;
    if (
      Object.prototype.hasOwnProperty.call(ethAddrs, ethAddr) ||
      Object.prototype.hasOwnProperty.call(tezAddrs, tezAddr)
    ) {
      const ethID = ethAddrs[ethAddr];
      const tezID = tezAddrs[tezAddr];
      const currentTime = new Date().getTime();
      if (
        (ethID !== undefined &&
          bots[ethID].lastSeen + maxInactiveTime >= currentTime) ||
        (tezID !== undefined &&
          bots[tezID].lastSeen + maxInactiveTime >= currentTime)
      )
        return res
          .status(401)
          .json({ error: "bot instance with same account already running" });
      if (ethID !== undefined) delete bots[ethID];
      if (ethID !== tezID && tezID !== undefined) delete bots[tezID];
    }
    let id = uuid(),
      retry = 0;

    while (Object.prototype.hasOwnProperty.call(bots, id)) {
      if (retry === 5) {
        return res
          .status(500)
          .json({ error: "failed to get unique id for bot" });
      }
      id = uuid();
      retry += 1;
    }

    const [ethAllowance, tezAllowance] = await Promise.all([
      ethClient.tokenAllowance(ethAddr),
      tezClient.tokenAllowance(tezAddr),
    ]);

    if (BigInt(ethAllowance) === 0n && BigInt(tezAllowance) === 0n) {
      return res.status(400).json({ error: "no allowance found" });
    }

    ethAddrs[ethAddr] = id;
    tezAddrs[tezAddr] = id;
    bots[id] = {
      ethAddr,
      tezAddr,
      ethAllowance: BigInt(ethAllowance),
      tezAllowance: BigInt(tezAllowance),
      lastSeen: new Date().getTime(),
    };
    return res.json({ id });
  } catch (err) {
    next(err);
  } finally {
    release();
  }
});

app.post("/bot/update", async (req, res, next) => {
  const release = await mutex.acquire();
  try {
    const { id } = req.body;
    if (!Object.prototype.hasOwnProperty.call(bots, id)) {
      return res.status(401).json({ error: "bot instance not found" });
    }
    const { ethAddr, tezAddr } = bots[id];
    const [ethAllowance, tezAllowance] = await Promise.all([
      ethClient.tokenAllowance(ethAddr),
      tezClient.tokenAllowance(tezAddr),
    ]);

    bots[id] = {
      ethAddr,
      tezAddr,
      ethAllowance: BigInt(ethAllowance),
      tezAllowance: BigInt(tezAllowance),
      lastSeen: new Date().getTime(),
    };

    return res.status(200).json({ success: "ok" });
  } catch (err) {
    next(err);
  } finally {
    release();
  }
});

app.get("/client/status", (req, res, next) => {
  try {
    const botData = Object.values(bots);
    let maxUSDtz = 0n,
      maxUSDC = 0n,
      totalUSDC = 0n,
      totalUSDtz = 0n;
    const currentTime = new Date().getTime();
    botData.forEach((data) => {
      if (data.lastSeen + maxInactiveTime <= currentTime) {
        return;
      }
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
      activeBots: botData.length,
    });
  } catch (err) {
    next(err);
  }
});

app.listen(port, () => {
  console.log(`Tezex Server listening on port ${port}!`);
});
