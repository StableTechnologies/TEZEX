import {
  ContractAbstraction,
  ContractProvider,
  TezosToolkit,
} from "@taquito/taquito";

type QuoteContract = ContractAbstraction<ContractProvider>;
const contracts = new WeakMap<
  TezosToolkit,
  {
    rpc: TezosToolkit["rpc"];
    entries: Map<string, Promise<QuoteContract>>;
  }
>();

/** Reuse contract code/schema; contract.storage() still fetches current state. */
export const getQuoteContract = (
  toolkit: TezosToolkit,
  address: string
): Promise<QuoteContract> => {
  let cache = contracts.get(toolkit);
  if (!cache || cache.rpc !== toolkit.rpc) {
    cache = { rpc: toolkit.rpc, entries: new Map() };
    contracts.set(toolkit, cache);
  }
  const existing = cache.entries.get(address);
  if (existing) return existing;
  const entries = cache.entries;
  const request = toolkit.contract.at(address).catch((error) => {
    if (entries.get(address) === request) entries.delete(address);
    throw error;
  });
  entries.set(address, request);
  return request;
};
