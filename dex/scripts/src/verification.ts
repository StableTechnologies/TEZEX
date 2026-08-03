export function verifyEqual(actual: string, expected: string, field: string): void {
    if (actual !== expected) {
        throw new Error(
            `Deployment verification failed for ${field}: expected ${expected}, got ${actual}`
        );
    }
}

export function verifyAtLeast(actual: string, minimum: string, field: string): void {
    if (BigInt(actual) < BigInt(minimum)) {
        throw new Error(
            `Deployment verification failed for ${field}: expected at least ${minimum}, got ${actual}`
        );
    }
}
