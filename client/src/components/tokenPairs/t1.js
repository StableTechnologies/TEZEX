import  { tokens, }  from '../constants/index';

const modifiedTokens = (tokens) => {
  const tokenMap = new Map();
  tokens.forEach((token) => {
    tokenMap.set(token.title, token);
  });
  return tokenMap;
}

const generatePairsAndNonPairs= (token, pairings) =>{
  const pairs =[];
  const tokenMap = modifiedTokens(tokens);
  tokenMap.delete(token);
  pairings.forEach((pair) => {
    const temp = tokenMap.get(pair);
    const p = {...temp, isPair: true};
    pairs.push(p);
  });

  pairs.forEach((pair) => {
    tokenMap.delete(pair.title);
  });
  let nonPairs = tokenMap.values();

  nonPairs = Array.from(nonPairs);

  nonPairs = nonPairs.map((nonPair) => {
    return { ...nonPair, isPair: false};
  });

  // return { pairs, nonPairs};
  return [ ...pairs, ...nonPairs];
};

export const getPairings = (tokens) => {
  return tokens.map((token) => {
    return {
      token: token.title,
      ...generatePairsAndNonPairs(token.title, token.pairs)
    };
  });
};

console.log(getPairings(tokens))