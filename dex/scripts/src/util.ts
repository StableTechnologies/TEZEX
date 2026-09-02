import { TezosToolkit } from "@taquito/taquito";
import { TransferParams } from "./types";

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

/** Detect FA1.2 vs FA2 from the on-chain transfer parameter shape. */
export async function detectTokenStandard(
    tezos: TezosToolkit,
    tokenAddress: string
): Promise<"FA1.2" | "FA2"> {
    const contract = await tezos.contract.at(tokenAddress);
    const transferParam = (contract as { entrypoints?: { entrypoints?: Record<string, unknown> } })
        .entrypoints?.entrypoints?.transfer
        ?? (await tezos.rpc.getEntrypoints(tokenAddress)).entrypoints.transfer;

    const encoded = JSON.stringify(transferParam);
    if (encoded.includes("%from_") || encoded.includes("from_")) {
        return "FA2";
    }
    if (encoded.includes("%from") || encoded.includes('"from"')) {
        return "FA1.2";
    }

    // Fall back: FA2 transfer is a list; FA1.2 is a pair.
    if (
        typeof transferParam === "object"
        && transferParam !== null
        && (transferParam as { prim?: string }).prim === "list"
    ) {
        return "FA2";
    }
    return "FA1.2";
}

export async function assertTokenStandardMatchesContract(
    tezos: TezosToolkit,
    tokenAddress: string,
    configuredStandard: string
): Promise<void> {
    const detected = await detectTokenStandard(tezos, tokenAddress);
    const configured = configuredStandard.toUpperCase();
    if (configured !== detected) {
        throw new Error(
            `TOKEN_STANDARD=${configuredStandard} does not match token ${tokenAddress} ` +
            `(on-chain transfer looks like ${detected}). ` +
            `Set TOKEN_STANDARD=${detected} and redeploy.`
        );
    }
}

async function getTokenBalanceFromTzkt(
    tzktApiUrl: string,
    tokenAddress: string,
    owner: string,
    tokenId: string
): Promise<bigint> {
    const query = new URLSearchParams({
        account: owner,
        "token.contract": tokenAddress,
        "token.tokenId": tokenId,
        limit: "1",
    });
    const response = await fetch(
        `${tzktApiUrl.replace(/\/$/, "")}/v1/tokens/balances?${query}`
    );
    if (!response.ok) {
        throw new Error(
            `TzKT token balance request failed with HTTP ${response.status}`
        );
    }

    const data: unknown = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
        return 0n;
    }

    const entry = data[0] as { balance?: unknown };
    const balance = entry.balance;
    if (typeof balance !== "string" || !/^\d+$/.test(balance)) {
        throw new Error("TzKT returned an invalid token balance");
    }
    return BigInt(balance);
}

export async function getTokenBalance(
    tezos: TezosToolkit,
    tokenAddress: string,
    owner: string,
    tokenStandard: string,
    tokenId: string = "0",
    tzktApiUrl?: string
): Promise<bigint> {
    try {
        const contract = await tezos.contract.at(tokenAddress);
        const storage: any = await contract.storage();

        if (tokenStandard.toUpperCase() === "FA2") {
            // Prefer positional pair — Previewnet TezLink schemas often lack
            // field annotations, so { owner, token_id } fails AddressToken encode.
            let balance: { toString(): string } | null | undefined;
            try {
                balance = await storage.ledger.get([owner, tokenId]);
            } catch {
                balance = await storage.ledger.get({
                    owner,
                    token_id: tokenId,
                });
            }
            return BigInt(balance?.toString() ?? "0");
        }

        // FA1.2 — some tokens use %balances (TZIP-7 / template), others %ledger.
        const ledger = storage.balances ?? storage.ledger;
        if (!ledger || typeof ledger.get !== "function") {
            throw new Error(
                `FA1.2 token ${tokenAddress} has no balances/ledger bigmap in storage`
            );
        }
        const balance = await ledger.get(owner);
        const value = balance?.balance ?? balance ?? 0;
        return BigInt(value.toString());
    } catch (error) {
        if (!tzktApiUrl) {
            throw error;
        }
        console.warn(
            `RPC token balance lookup failed; falling back to TzKT (${tzktApiUrl}).`
        );
        return getTokenBalanceFromTzkt(
            tzktApiUrl,
            tokenAddress,
            owner,
            tokenId
        );
    }
}

/**
 * Read a token balance from the configured RPC and fail closed on any error.
 *
 * Release gates must use this function so an unavailable RPC cannot silently
 * substitute an indexer balance from an older block.
 */
export async function getTokenBalanceFromRpc(
    tezos: TezosToolkit,
    tokenAddress: string,
    owner: string,
    tokenStandard: string,
    tokenId: string = "0"
): Promise<bigint> {
    return getTokenBalance(
        tezos,
        tokenAddress,
        owner,
        tokenStandard,
        tokenId
    );
}
