# LQT metadata (FA1.2 / TZIP-016)

Bake-at-origination only — `lqt_fa12.mligo` has no metadata update entrypoint.
Deploy wires `METADATA_URI` / `TOKEN_METADATA_URI` from `.env` into LQT storage
(see `scripts/src/deploy.ts`).

## Templates

Source JSON: `scripts/metadata/`.

| File | Role |
| --- | --- |
| `lqt-contract.json` | Shared TZIP-016 contract metadata (`interfaces: ["TZIP-007"]` only) |
| `lqt-contract-xtz-*.json` | Pair-specific contract metadata (preferred for Previewnet redeploys) |
| `lqt-xtz-*.json` | Per-pool token metadata (`name` / `symbol` / `decimals` / `shouldPreferSymbol: true`) |

## Previewnet redeploy URIs

Pinned on Pinata dedicated gateway
`https://fuchsia-active-gamefowl-286.mypinata.cloud/ipfs/<CID>`.

| Pool | `METADATA_URI` | `TOKEN_METADATA_URI` |
| --- | --- | --- |
| XTZ–USDt | `ipfs://bafkreiecvnqo4vapdiyukvzyaklveym3cvaqtdj6fzbnxnnvt4adekwgwe` | `ipfs://bafkreigxshv72rcp32i254zhgxqcmvfksoyr343csxmgdetsuqiae7g22a` |
| XTZ–USDtz | `ipfs://bafkreigfneq5eaxlmwyjahmsvm4cwxikdzshs55ujamnbzijdsgf42xfgu` | `ipfs://bafkreiejiqvstfafwumwl4bcyit4pcwmgfdx7aths5dt5hgotm67m3v2tm` |
| XTZ–BTCtz | `ipfs://bafkreiaumi6epqmi7ldbnj5kedpmjvgw3nxj32fsxm6qiul7plcteszjbu` | `ipfs://bafkreigm2kug4344rakvmjhbr7d5srxidasl72voe56stq7i5yvw5o7pci` |

Shared fallback contract metadata:
`ipfs://bafkreifz6rirmj74nn5zw2cxg2avzbaq54pre7xaphbpixs3entycbe7li`.

Thumbnail shared with Shadownet LP branding:
`ipfs://bafkreidumr3xiifencjp4mlaa26laeahqeopatgfgg5aqblht2j3krzdri`.

## Pinning

Authoritative CIDs are from Pinata (CIDv1 / raw). Local Kubo CIDv0 hashes differ
for the same bytes and should not be used in `.env`. Keep the JSON under
`scripts/metadata/` as the source of truth if re-pinning is needed.
