const express = require("express");
const Ethereum = require("./library/ethereum");
const { init, getAllowances, log } = require("./library/util.js");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 8000;
const bots = {};
const maxInactiveTime = 180000; // time in milliseconds

let clients = {},
  swapPairs = {};

app.use(express.json());
app.use(cors());

app.post("/bot/ping", async (req, res) => {
  try {
    const { accounts, volume } = req.body;
    const { allowances, foundNonZero } = await getAllowances(
      { accounts, volume },
      clients,
      swapPairs
    );
    if (allowances === undefined || foundNonZero === undefined) {
      return res.status(400).json({ error: "Malformed Request" });
    }
    if (foundNonZero === false) {
      return res.status(400).json({ error: "No allowance found" });
    }
    const id = accounts["ethereum"] + accounts["tezos"];

    bots[id] = {
      accounts,
      allowances,
      lastSeen: new Date().getTime(),
    };
    log([
      "PING FROM : ",
      accounts,
      "\n",
      "WITH ALLOWANCES : ",
      JSON.stringify(allowances, null, 4),
    ]);
    return res.status(200).json({ success: "ok" });
  } catch (err) {
    console.log(`[x] ERROR : ${err.toString()}`);
    return res.status(500).json({ error: err.toString() });
  }
});

app.get("/client/status", (req, res, next) => {
  try {
    const botData = Object.values(bots);
    let max = {},
      total = {},
      count = 0;
    const currentTime = new Date().getTime();
    const pairs = Object.keys(swapPairs);
    botData.forEach((data) => {
      if (data.lastSeen + maxInactiveTime <= currentTime) {
        return;
      }
      count++;
      if (count === 1) {
        max = { ...data.allowances };
        total = { ...data.allowances };
        return;
      }
      for (const pair of pairs) {
        const assets = pair.split("/");
        if (max[pair][assets[0]].lt(data.allowances[pair][assets[0]]))
          max[pair][assets[0]] = data.allowances[pair][assets[0]];
        if (max[pair][assets[1]].lt(data.allowances[pair][assets[1]]))
          max[pair][assets[1]] = data.allowances[pair][assets[1]];
        total[pair][assets[0]] = total[pair][assets[0]].plus(
          data.allowances[pair][assets[0]]
        );
        total[pair][assets[1]] = total[pair][assets[1]].plus(
          data.allowances[pair][assets[1]]
        );
      }
    });
    res.status(200).send(
      JSON.stringify({
        max,
        total,
        activeBots: count,
      })
    );
  } catch (err) {
    next(err);
  }
});

init().then((data) => {
  clients = data.clients;
  swapPairs = data.swapPairs;
  app.listen(port, () => {
    console.log(`Tezex Server listening on port ${port}!`);
  });
});
