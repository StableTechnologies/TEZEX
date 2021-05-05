# TEZEX BOT

TEZEX Bot instances are run by the market makers of the TEZEX platform. Do read the [warning](#warning) section at the end before running the bot.

## Requirements

1. Node 12.x
2. Tezos Account with USDtz, ETHtz tokens and sufficient xtz

## Configuration

Follow the following steps to setup and run the bot

1. Clone the repo and navigate to the `bot-tezos-swap` directory
2. Install dependencies

```sh
tezex@bot:~/TEZEX/bot-tezos-swap$ npm i
```

3. In the bot dir you will find a `user-config.json` file with the following details:

```json
{
  "tezos": {
    "walletPK": "your-tezos-private-key"
  },
  "maxVolume": {
    "xtz/usdtz": {
      "xtz": 100,
      "usdtz": 300,
      "tolerance": 5
    },
    "xtz/ethtz": {
      "xtz": 100,
      "ethtz": 0.1,
      "tolerance": 5
    },
    "ethtz/usdtz": {
      "usdtz": 300,
      "ethtz": 0.1,
      "tolerance": 5
    }
  }
}
```

4. You will have to update the config file with your own tezos `walletPK` (private keys). The `maxVolume` config let's you tune the amount of tokens you want to trade in a single run of the bot instance, you should specify the exact amount that you want your bot to trade. `tolerance` specifies how much you are willing to pay above the current market rate, this is kept because the oracle rates can be very volatile. The value of `tolerance` is in percentage, for eg. if a user is offering a swap of `10 XTZ` for `60 USDtz` but the current value of `1 XTZ = 5 USDtz` then your bot will take up this swap iff your `tolerance` is set to `20` or above else it will ignore this offer as the difference in the market rate and the users expected rate is `20%`.

5. Once you have setup the config file you can go ahead and start the bot. When the bot will run for the first time it will ask for a password and encrypt your config file after which you won't be able to directly change it. To update the config you will have to remove the encrypted file and re-create the `user-config.json` file with the above details.

The snippet below shows the first run of the bot :

```sh
tezex@bot:~/TEZEX/bot$ npm start

XX Encrypted User Config Not Found!

Please make sure you have created the `user-config.json` file with the required details as mentioned in the documentation

Please enter your password to encrypt the `user-config.json`: *****
Re-enter password: *****

The user-config.json file is now going to be encrypted, make sure all required details are present. Continue? (y/n):  y

Initializing Bot...
```

6. After the first the the `user-config.json` file will be encrypted. From the next time when you run the bot you will be prompted for the password which will be used to decrypt the config and initialize the bot.

```sh
tezex@bot:~/TEZEX/bot$ npm start

Encrypted User Config Found!
Please enter your password to start the bot: *****

Please Confirm Details:

- Tezos Details:
--- Account: tz1........
--- Asset Balance:
  -- XTZ : 43551.710923 xtz
  -- ETHtz : 498998.5836 ethtz
  -- USDtz : 499145.051012 usdtz
--- Bot trade Volume:
  -- XTZ : 200 xtz
  -- ETHtz : 0.2 ethtz
  -- USDtz : 600 usdtz

Are the above details correct? (y/n): y

Initializing Bot...
```

# WARNING!

1. If the Bot fails to encrypt the user-config make sure to remove your sensitive data like private keys from that file.

2. The Bots are secure and autonomous, but there are possible instances where running the bot with improper configuration can cause asset loss. Here are a few things that needs to be made sure before running the bot:

   a. The bot needs to be always connected to the network and should not be closed while it is engaged in an active swap. In most cases the bot swaps can be refunded but in some the swap assets will be lost forever.

   b. Make sure you have enough balance(xtz) before starting the bot, this balance is needed to pay for tx fees. The bot checks your balance with a total estimated tx fee having a considerable margin, if it finds the current balance below the estimated fees it will show a warning. You can make a choice to run the bot or refill first and then start the bot. The estimated fees are in no way exact or accurate, the estimation is made on the maximum no. of swaps possible with the given volume of assets the bot is configured with.
   If your balance drops below the tx fees at any point your bot will fail to operate which can also lead to asset loss in some cases!

   c. Do not use the same accounts in more than **1 bot** at the same time. The bot accounts should not be used at all (manually or automatic) while the bot is running. It is advised to create separate dedicated accounts for the bot. Running the the same accounts on more than 1 bot or directly making txs with the accounts while the bot is active can cause tx failures and in turn asset loss.
