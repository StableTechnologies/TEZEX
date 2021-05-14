# TEZEX Contracts

## Test Contracts

Follow the steps to test the contracts for ethereum and tezos respectively

### Ethereum

```sh
cd ethereum

npm i

npm run test
```

### Tezos

```sh
cd tezos

#install smartpy cli
sh <(curl -s https://smartpy.io/cli/install.sh)

~/smartpy-cli/SmartPy.sh test TokenSwap.py tmp/

~/smartpy-cli/SmartPy.sh test FeeStore.py tmp/
```

## Compile Contracts

Follow the steps to compile the contracts for ethereum and tezos respectively

### Ethereum

```sh
cd ethereum

npm i

npm run compile
```

### Tezos

```sh
cd tezos

#install smartpy cli
sh <(curl -s https://smartpy.io/cli/install.sh)

~/smartpy-cli/SmartPy.sh compile TokenSwap.py build/
~/smartpy-cli/SmartPy.sh compile FeeStore.py build/
```

## Deplopy

Update the `config.json` file with the required details, then in`deploy.js` update the `run()` function call to `run(false)` if you want to deploy the contracts. By default `deploy.js` will give only fee estimates for the contract deploy.

```sh
npm i

node deploy.js
```
