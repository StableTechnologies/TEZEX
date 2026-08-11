import React from "react";
import { Link } from "react-router-dom";

import tezexLogo from "../../../../assets/TezexLogo.svg";
import tezosLogoBlack from "../../../../assets/TezosLogo_Horizontal_Black.svg";
import tezosLogoWhite from "../../../../assets/TezosLogo_Horizontal_White.svg";
import { useSession } from "../../../../hooks/session";
import "./style.css";
import { homePathForHost } from "../../../../routing";
import { DEFAULT_LIQUIDITY_PATH } from "../../../../tradeRouting";

const GITHUB_URL = "https://github.com/StableTechnologies/TEZEX";
const X_URL = "https://x.com/TezosExchange";
const DISCORD_URL = "https://discord.gg/VZPAmEJVsC";
const DOCS_URL = "https://docs.tezex.io";

const socialLinks = [
  {
    label: "TEZEX on X",
    href: X_URL,
    path: "M18.9 2H22l-7.6 8.7L23 22h-6.9l-5.4-7-6.2 7H1.4l8.1-9.3L1 2h7.1l4.9 6.4L18.9 2Z",
  },
  {
    label: "TEZEX on GitHub",
    href: GITHUB_URL,
    path: "M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.8 10.9.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.1 1.7 1.1 1 1.7 2.6 1.2 3.3.9.1-.7.4-1.2.7-1.5-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2.9-.3 1.9-.4 2.9-.4s2 .1 2.9.4c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.7.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .4.2.7.8.6 4.5-1.5 7.8-5.8 7.8-10.9C23.5 5.7 18.3.5 12 .5Z",
  },
  {
    label: "TEZEX on Discord",
    href: DISCORD_URL,
    path: "M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.2.4c1.6.4 2.9 1 4.1 1.8a13.9 13.9 0 0 0-10.6 0c1.2-.8 2.6-1.4 4.1-1.8L12.6 3a19.8 19.8 0 0 0-4.9 1.4C4.6 8.9 3.8 13.3 4.2 17.6a19.9 19.9 0 0 0 6 3l1.2-1.9c-.7-.3-1.3-.6-1.9-1l.5-.4a14.2 14.2 0 0 0 12 0l.5.4c-.6.4-1.2.7-1.9 1l1.2 1.9c2.2-.7 4.2-1.7 6-3 .5-5-.8-9.4-3.5-13.2ZM9.7 15.1c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm4.6 0c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z",
  },
];

const ExternalLink = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => (
  <a href={href} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
);

export function Footer() {
  const { appConfig } = useSession();
  const homePath = homePathForHost(window.location.hostname);

  return (
    <footer className="tezex-footer">
      <div className="tezex-footer__wrap">
        <div className="tezex-footer__top">
          <section className="tezex-footer__brand" aria-label="About TEZEX">
            <Link
              to={homePath}
              className="tezex-footer__home"
              aria-label="TEZEX home"
            >
              <img
                className="tezex-footer__tezex-logo"
                src={tezexLogo}
                alt="TEZEX"
              />
            </Link>
            <p className="tezex-footer__tagline">Tezos liquidity exchange</p>

            <div className="tezex-footer__socials" aria-label="TEZEX community">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d={social.path} />
                  </svg>
                </a>
              ))}
            </div>
          </section>

          <nav
            className="tezex-footer__column tezex-footer__column--product"
            aria-label="Product"
          >
            <h2>Product</h2>
            <ul>
              <li>
                <Link to={homePath}>Swap</Link>
              </li>
              <li>
                <Link to={DEFAULT_LIQUIDITY_PATH}>Liquidity</Link>
              </li>
              <li>
                <Link to="/analytics">Analytics</Link>
              </li>
              <li>
                <Link to="/stez">sTEZ</Link>
              </li>
            </ul>
          </nav>

          <nav
            className="tezex-footer__column tezex-footer__column--resources"
            aria-label="Resources"
          >
            <h2>Resources</h2>
            <ul>
              <li>
                <ExternalLink href={DOCS_URL}>Docs</ExternalLink>
              </li>
              <li>
                <ExternalLink href={GITHUB_URL}>GitHub</ExternalLink>
              </li>
              <li>
                <ExternalLink href={appConfig.aboutRedirectUrl}>
                  About
                </ExternalLink>
              </li>
              <li>
                <ExternalLink href={DISCORD_URL}>Discord</ExternalLink>
              </li>
            </ul>
          </nav>

          <div className="tezex-footer__built-on">
            <span className="tezex-footer__kicker">Proudly built on</span>
            <ExternalLink href="https://tezos.com">
              <span className="tezex-footer__tezos-lockup" aria-label="Tezos">
                <img
                  className="tezex-footer__tezos-logo tezex-footer__tezos-logo--white"
                  src={tezosLogoWhite}
                  alt=""
                  aria-hidden="true"
                />
                <img
                  className="tezex-footer__tezos-logo tezex-footer__tezos-logo--black"
                  src={tezosLogoBlack}
                  alt=""
                  aria-hidden="true"
                />
              </span>
            </ExternalLink>
          </div>
        </div>

        <div className="tezex-footer__bottom">
          <p>
            © {new Date().getFullYear()} StableTech
            <span aria-hidden="true">|</span>
            Tezos Stable Technologies
          </p>
        </div>
      </div>
    </footer>
  );
}
