"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import MonPrice from "@/components/mon-price";
import "./landing-softui.css";

// Inline SVG icon set (stroke style, no emoji, no AI-slop)
const ICO = {
  play: (
    <svg viewBox="0 0 16 18" fill="none" aria-hidden="true">
      <path d="M1 1.6C1 0.7 2 0.19 2.8 0.65L14.6 7.55C15.4 8 15.4 9.06 14.6 9.51L2.8 16.41C2 16.87 1 16.36 1 15.46V1.6Z" fill="currentColor" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2.5 8.5 6 12l7.5-8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  gift: (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="6" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <line x1="8" y1="2.5" x2="8" y2="6" stroke="currentColor" strokeWidth="1.6" />
      <line x1="8" y1="6" x2="8" y2="14" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 10h6" stroke="currentColor" strokeWidth="1.2" opacity=".5" />
    </svg>
  ),
  giftBox: (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 1.5c.9 0 1.6.8 1.5 1.7L9.4 4.6l.9 1.2h2.2c.8 0 1.5.7 1.5 1.5v.4c0 .8-.7 1.5-1.5 1.5h-.5v4.3c0 .8-.7 1.5-1.5 1.5H7.5a1.5 1.5 0 0 1-1.5-1.5V9.2H5.5c-.8 0-1.5-.7-1.5-1.5v-.4c0-.8.7-1.5 1.5-1.5h2.2l.9-1.2-.1-1.3c.1-1 .8-1.8 1.5-1.8Zm-3 8.7h5v4.3h-5v-4.3ZM8 3c.4 0 .7.4.6.8L8.5 5H9c.5 0 .9.4.9.9v.1c0 .5-.4.9-.9.9H9.5V4.5c0-.8-.7-1.5-1.5-1.5Z" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 14c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  msg: (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 14.5 1.5 8.5 3 3h10l1.5 5.5L8 14.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  ),
  yt: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3 2 8l10 5 10-5-10-5Zm0 8.6L7.2 9.7 12 12.7l4.8-3-4.8-1.1Z" />
      <path d="M2 13.5l10 5 10-5v5l-10 5-10-5v-5Z" opacity=".55" />
    </svg>
  ),
  tt: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  ),
  coins: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="5.5" cy="8" r="3.8" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10.5" cy="8" r="3.8" stroke="currentColor" strokeWidth="1.5" opacity=".55" />
      <path d="M8 5.7a1.6 1.6 0 0 1 0 4.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  cam: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="3.5" width="13" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="2.4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 1.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  bulb: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 11.2V3.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="11.9" r="1" fill="currentColor" />
    </svg>
  ),
  share: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="5" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="11.5" cy="3.8" r="2.2" stroke="currentColor" strokeWidth="1.5" opacity=".55" />
      <circle cx="11.5" cy="12.2" r="2.2" stroke="currentColor" strokeWidth="1.5" opacity=".55" />
      <path d="M7 7.2l2.6-2M7 8.8l2.6 2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  ),
};

export default function Home() {
  const { ready, authenticated, login } = usePrivy();

  const navFallback = (
    <>
      {ready && !authenticated ? (
        <button className="btn btn-ghost btn-nav" onClick={login}>
          Login
        </button>
      ) : (
        <Link href="/send" className="btn btn-ghost btn-nav">
          Dashboard
        </Link>
      )}
      <Link href="/send" className="btn btn-solid btn-nav">
        Send a gift
      </Link>
    </>
  );

  return (
    <div className="home-softui">
      <nav className="nav">
        <div className="nav-inner">
          <a className="brand" href="#">
            <img src="/assets/mytips-icon.png" alt="MYTIPS" />
            MYTIPS
          </a>
          <div className="nav-links">
            <span className="monchip">
              <MonPrice compact />
            </span>
            <a className="ghostlink" href="#how">How it works</a>
            <a className="ghostlink" href="/send">Dashboard</a>
            <a className="ghostlink" href="https://github.com/jinkatama105/mytips" target="_blank" rel="noopener noreferrer">GitHub</a>
            <Link className="btn btn-solid btn-nav" href="/send">Send a gift</Link>
          </div>
          <div className="nav-mobile-cta">{navFallback}</div>
        </div>
      </nav>

      <header className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="kicker">Onchain gifts</div>
            <h1>Send a gift.<br />Make it <span className="hl">remembered.</span></h1>
            <p className="lede">$MON to any wallet — attach a video, add a custom message. Need an idea? MYTIPS AI assistant is ready to help. One link, anywhere. Live on Monad mainnet.</p>
            <div className="hero-cta">
              <Link href="/send" className="btn btn-solid btn-lg">Send a gift</Link>
              <a href="#how" className="btn btn-ghost btn-lg">Explore</a>
            </div>
          </div>
          <div className="hero-right">
            <div className="frame">
              <div className="fc-media" role="img" aria-label="Attached gift video, 0:42">
                <img className="bg" src="/assets/vid_thumb.png" alt="" aria-hidden="true" />
                <div className="dim" aria-hidden="true" />
                <div className="fc-cta" aria-hidden="true">{ICO.play}</div>
                <div className="fc-badges">
                  <span>{ICO.yt}YouTube</span>
                  <span>{ICO.tt}TikTok</span>
                </div>
                <span className="fc-dur">0:42</span>
              </div>
              <div className="fc-rows">
                <div className="fc-row">
                  <div className="fc-av ok" aria-hidden="true">{ICO.check}</div>
                  <div className="mid"><b>Transaction Sent!</b><span>0x71c2…3a4f</span></div>
                  <div className="fc-end"><span className="fc-amt">+0.05 MON</span><span className="fc-usd">$5.00</span></div>
                </div>
                <div className="fc-row">
                  <div className="fc-av vio" aria-hidden="true">{ICO.gift}</div>
                  <div className="mid"><b>Gift Attached!</b><span>0x71c2…3a4f</span></div>
                  <div className="fc-gift" aria-hidden="true">{ICO.giftBox}</div>
                </div>
                <div className="fc-row">
                  <div className="fc-av tea" aria-hidden="true">{ICO.user}</div>
                  <div className="mid"><b>Recipient</b><span>0x71c2…3a4f</span></div>
                  <div className="fc-end"><span className="fc-amt">+0.05 MON</span><span className="fc-usd">$5.00</span></div>
                </div>
              </div>
              <div className="fc-msglbl">{ICO.msg}Your message</div>
              <div className="fc-msg">&quot;thank you always bro, i hope you have a happy life&quot;</div>
            </div>
          </div>
        </div>
      </header>

      <section id="how">
        <div className="wrap">
          <div className="kicker">How it works</div>
          <h2>From a transfer to a link worth opening.</h2>
          <div className="steps">
            <div className="step">
              <div className="step-hd">
                <div className="step-ic" aria-hidden="true">{ICO.coins}</div>
                <div className="num">1</div>
              </div>
              <h3>Send or attach</h3>
              <p>MON to any Monad wallet, we keep the transaction.</p>
            </div>
            <div className="step">
              <div className="step-hd">
                <div className="step-ic" aria-hidden="true">{ICO.cam}</div>
                <div className="num">2</div>
              </div>
              <h3>Add video + message</h3>
              <p>Paste a YouTube, TikTok, X or Instagram link and a note.</p>
            </div>
            <div className="step">
              <div className="step-hd">
                <div className="step-ic" aria-hidden="true">{ICO.bulb}</div>
                <div className="num">3</div>
              </div>
              <h3>AI Idea Assistant</h3>
              <p>Stuck? Ask for gift ideas and captions in one prompt.</p>
            </div>
            <div className="step">
              <div className="step-hd">
                <div className="step-ic" aria-hidden="true">{ICO.share}</div>
                <div className="num">4</div>
              </div>
              <h3>Share the page</h3>
              <p>One public link. No signups, no escrow, no custody.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="faq">
        <div className="wrap faq-wrap">
          <div className="kicker">FAQ</div>
          <h2>Straight answers.</h2>
          <details className="qa">
            <summary>Is MyTips a wallet or an exchange?</summary>
            <div className="qa-body">No — a public gift page generator. You keep custody, we show the on-chain transfer with your video and message.</div>
          </details>
          <details className="qa">
            <summary>How long does a gift page live?</summary>
            <div className="qa-body">As long as the chain does. The page is static, the transaction is forever.</div>
          </details>
          <details className="qa">
            <summary>What does it cost?</summary>
            <div className="qa-body">Just the network gas for your transfer. Creating and sharing the gift page is free.</div>
          </details>
          <details className="qa">
            <summary>Which platforms can the video come from?</summary>
            <div className="qa-body">YouTube, TikTok, X, Instagram, Facebook, or any direct video link.</div>
          </details>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="cta-panel">
            <h2>Someone deserves a gift today.</h2>
            <p>Send MON. Attach the moment. Share one link.</p>
            <Link href="/send" className="btn btn-solid btn-lg">Send a gift</Link>
            <p className="metaline">Mainnet · built for the Metropolis hackathon</p>
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap foot">
          <span>MYTIPS</span>
          <span>Made on Monad</span>
        </div>
      </footer>
    </div>
  );
}