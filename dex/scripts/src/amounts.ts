const NAT_PATTERN = /^(0|[1-9][0-9]*)$/;

export function parseNat(value: string, name: string): string {
    const normalized = value.trim();
    if (!NAT_PATTERN.test(normalized)) {
        throw new Error(`${name} must be a non-negative base-10 integer`);
    }
    return BigInt(normalized).toString();
}

export function toSafeNumber(value: string, name: string): number {
    const parsed = BigInt(parseNat(value, name));
    if (parsed > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error(
            `${name} exceeds the exact integer range accepted by the Taquito amount API`
        );
    }
    return Number(parsed);
}

export function integerSquareRoot(value: bigint): bigint {
    if (value < 0n) {
        throw new Error("Cannot calculate the square root of a negative integer");
    }
    if (value < 2n) {
        return value;
    }

    let estimate = 1n << (BigInt(value.toString(2).length) + 1n >> 1n);
    while (true) {
        const next = (estimate + value / estimate) >> 1n;
        if (next >= estimate) {
            return estimate;
        }
        estimate = next;
    }
}

export function calculateInitialLqt(xtz: string, token: string): string {
    const product = BigInt(parseNat(xtz, "SEED_XTZ"))
        * BigInt(parseNat(token, "SEED_TOKEN"));
    return integerSquareRoot(product).toString();
}

export function formatMutez(value: string): string {
    const mutez = BigInt(parseNat(value, "mutez value"));
    const whole = mutez / 1_000_000n;
    const fraction = (mutez % 1_000_000n).toString().padStart(6, "0");
    return `${whole}.${fraction}`;
}
