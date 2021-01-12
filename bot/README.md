# TEZEX BOT

TEZEX Bot instances are run by the market makers of the TEZEX platform.

## Requirements

1. Node 12.x
2. Ethereum Account with USDC tokens and some eth
3. Tezos Account with USDTz tokens and some xtz

## Configuration

Follow the following steps to setup and run the bot

1. Clone the repo and navigate to the `bot` directory
2. Install dependencies

```sh
tezex@bot:~/TEZEX/bot$ npm i
```

3. In the bot dir you will find a `user-config.json` file with the following details:

```json
{
  "tezos": {
    "walletAddress": "",
    "walletPK": ""
  },
  "ethereum": {
    "walletAddress": "",
    "walletPK": ""
  },
  "maxVolume": {
    "usdc": 300,
    "usdtz": 300
  }
}
```

4. You will have to update the config file with your own ethereum and tezos `walletAddress` and `walletPK` (private keys). The `maxVolume` config let's you tune the amount of tokens you want to trade in a single run of the bot instance, you should specify the exact amount that you want your bot to trade.

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
 - Eth Address: 0x00000000000...
 - Tezos Address: tz1zzzz.......
 - Trade Volume : {"usdc":300,"usdtz":300}
Are the above details correct? (y/n): y

Initializing Bot...
```

## WARNING

If the bot fails to encrypt the user-config make sure to remove your sensitive data like private keys from that file.
