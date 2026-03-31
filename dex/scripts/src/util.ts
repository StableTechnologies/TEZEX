import { TezosToolkit } from "@taquito/taquito";
import { TransferParams } from "./types";
import BigNumber from "bignumber.js";

export function prepareTokenTransfer(
    tokenStandard: string,
    params: TransferParams
) {
    const { from, to, amount, tokenId } = params;

    if (tokenStandard.toUpperCase() === 'FA2') {
        return {
            transfer: [{
                from_: from,
                txs: [{
                    to_: to,
                    token_id: tokenId,
                    amount
                }]
            }]
        };
    }

    // Default to FA1.2 transfer format
    return {
        transfer: {
            from,
            to,
            value: amount
        }
    };
}

export async function getTokenBalance(
    tezos: TezosToolkit,
    tokenAddress: string,
    owner: string,
    tokenStandard: string,
    tokenId: number = 0
): Promise<number> {
    const contract = await tezos.contract.at(tokenAddress);
    const storage: any = await contract.storage();

    if (tokenStandard.toUpperCase() === 'FA2') {
        const key = { owner, token_id: tokenId };
        const balance = await storage.ledger.get(key);
        return balance?.toNumber() ?? 0;
    }

    // FA1.2
    const balance = await storage.ledger.get(owner);
    return balance.balance ?? 0;
}
