# TEZEX UI release checklist

This checklist treats the UI as a mainnet transaction client. A successful build is necessary, but the release is not complete until one deliberately small wallet transaction is confirmed on-chain.

## Current rollback baseline

- `origin/gh-pages`: `34995a9387d129c37e929f85e5215a59d73c9aa5`
- Captured: 2026-07-20
- Re-run `git fetch origin gh-pages && git rev-parse origin/gh-pages` immediately before deployment and save the fresh value if it changed.

## Automated release gate

From `V2/tezex`:

```bash
HUSKY=0 npm ci
npm run verify
```

`npm run verify` must pass the production dependency audit threshold, TypeScript checks, tests, and optimized build. Do not use `npm audit fix --force`; the currently suggested forced resolution downgrades Beacon and can break wallet compatibility.

## Manual preview checks

- Desktop, intermediate, and mobile widths render without clipped or missing controls.
- Swap/Liquidity, Add/Remove Liquidity, light/dark mode, pool selector, menu, and all slippage choices work.
- Selecting Custom slippage does not change the control height.
- Values outside 0.1%–5% are blocked; values above 1% show a warning.
- Max Tez retains the configured fee reserve.
- Request/Swap/Complete animation honors reduced-motion settings.
- Browser console contains no TEZEX or Beacon integration errors.

## Mainnet wallet smoke test

Use a dedicated low-balance test wallet and the smallest practical trade amount.

1. Confirm the header and wallet both show Mainnet.
2. Enter a small swap and compare the pool, input, minimum received, recipient, and fees in the wallet before approving.
3. Confirm the UI moves from Request to Swap only after wallet initiation.
4. Record the operation hash and verify that TzKT reports `applied`.
5. Confirm the UI reaches Complete only after on-chain confirmation and balances refresh.
6. Test wallet rejection. The UI must show a failure explanation and return to Request.
7. If confirmation cannot be verified, confirm the UI shows the hash, links to TzKT, and does not offer a blind retry.

## Deploy

Only after the automated gate and wallet smoke test pass:

```bash
git fetch origin gh-pages
git rev-parse origin/gh-pages
cd V2/tezex
npm run deploy
```

The `predeploy` script runs the full verification gate again before publishing. After publishing, record the new `gh-pages` commit and verify `https://tezex.io/#/home/swap` in a fresh browser session.

## Roll back without rewriting history

If the production smoke check fails, revert the deployment commit on `gh-pages` instead of force-pushing:

```bash
git fetch origin gh-pages
git switch -c codex/rollback-tezex-ui origin/gh-pages
git revert <new-gh-pages-deployment-commit>
git push origin HEAD:gh-pages
```

Then verify that `tezex.io` serves the recorded baseline and investigate on the feature branch.
