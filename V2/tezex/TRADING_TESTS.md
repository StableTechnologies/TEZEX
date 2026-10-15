# Trading interaction contract

Swap, Add Liquidity, and Remove Liquidity must behave consistently when users change their minds mid-flow. Tests should assert the state after each action, not only after a final edit that could repair an earlier failure.

## Invariants

- The URL, selected pool, token direction, transaction identity, amount, and quote describe the same intent.
- An edit updates the transaction draft and invalidates its quote immediately. Only the RPC request is debounced. Leaving the screen does not discard an accepted edit.
- Late successes and failures cannot overwrite a newer amount, direction, pool, account, or network. Balance refreshes cannot restore a status from before an edit.
- An RPC request in one form never holds the shared mutation lock while it waits for the network.
- Switching screens retains the draft and direction for the same pool. Selecting another pair starts a fresh draft. Browser back/forward must restore a route-consistent form.
- Reversal uses the previous quoted output as the new input. If no current output exists, the reversed input is zero; the old number must not be silently assigned to a different token.
- Inputs accept partial decimal edits, enforce token precision, and reject malformed/negative/exponent pastes without converting them into a different positive amount.
- Slippage stays exact across navigation. Invalid custom slippage remains invalid until corrected, even after editing an amount.
- Missing transactions and submitted operations are not editable. Navigating or changing another screen's pool cannot clear a submitted operation. Returning to it restores its canonical route.
- A cleared amount stays an empty-amount state through balance refreshes. Integer LP estimates keep significant trailing zeros.

## Automated coverage

`src/components/tradingSequences.test.tsx` exercises real providers, routes, navigation, selectors, and input components. Network adapters and balance reads are deterministic mocks so responses can be delayed, reordered, or rejected. It currently contains 76 scenarios:

- All 14 configured pool entries across Mainnet, Shadownet, and Previewnet: both swap directions, both deposit orders, withdrawal, clearing, and screen changes.
- All 36 ordered pairs of edit, clear, reverse, pair change, mode change, and leave/return while responses are pending.
- Four deterministic longer sequences, checking consistency between actions.
- Focused regressions for immediate navigation, reverse/edit races, either token selector, browser history, account/disconnect/network changes, custom slippage, Use Max, failures, animation interruption, submitted-operation protection, precision, integer LP formatting, and queued balance refreshes.

Existing `tradingForms.test.tsx`, amount-input, wallet, quote-safety, routing, adapter, network, sTEZ, and other suites remain part of the full gate.

Run the complete release gate from `V2/tezex`:

```sh
npm run verify
```

For a focused sequence run:

```sh
npm test -- --watchAll=false --runInBand --runTestsByPath src/components/tradingSequences.test.tsx
```

## Release checks and limits

Also exercise mixed actions in a real browser against live read-only quotes, both disconnected and with an existing wallet session. Include typing before quotes arrive, switching either token, reversal, editing again, switching forms, back/forward, exact custom slippage, and clearing. Check visible values and URLs, not just successful clicks.

This is bounded coverage, not proof of every possible action sequence, RPC outage, wallet, or device. Mocked pool tests verify application state across configured pools; they do not attest that every external testnet deployment is healthy. Wallet approval, signing, and on-chain confirmation require separate authorized transaction checks. Add any newly reproduced sequence to the automated suite before fixing it, and extend these invariants to other interactive flows as they change.
