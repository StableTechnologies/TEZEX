import { tokens, } from '../constants/index';

export const getPairings = (tokens) => {
  return tokens.map(token => {
    switch (token.title) {
      case "USDtz":
        return { token: token.title, pairs: [tokens[1], tokens[2], tokens[4]] }
      case "USDC":
        return { token: token.title, pairs: [tokens[0]] }
      case "ETHtz":
        return { token: token.title, pairs: [tokens[0], tokens[3], tokens[4]] }
      case "ETH":
        return { token: token.title, pairs: [tokens[2]] }
      case "XTZ":
        return { token: token.title, pairs: [tokens[0], tokens[2]] }
      case "WBTC":
        return { token: token.title, pairs: [tokens[6]] }
      case "tzBTC":
        return { token: token.title, pairs: [tokens[5]] }
      default:
        return tokens;
    }
  })
}

const tokenWithPairs = getPairings(tokens);

export const selectToken = (tokenTitle) => {
  let pair = tokens;

  tokenWithPairs.map(tokenPair => {
    if (tokenPair.token === tokenTitle) {
      pair = tokenPair.pairs;
    }
  })
  return pair;
}
