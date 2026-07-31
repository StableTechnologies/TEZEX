export const STEZ_HOSTNAME = "stez.tezex.io";
export const CANONICAL_TEZEX_ORIGIN = "https://tezex.io";

export const isStezOnlyHost = (hostname: string) =>
  hostname.trim().toLowerCase() === STEZ_HOSTNAME;

export const canonicalTezexUrl = (pathname: string, search = "") =>
  `${CANONICAL_TEZEX_ORIGIN}/#${pathname}${search}`;
