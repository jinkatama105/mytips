"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import MonPrice from "@/components/mon-price";
import "./landing.css";

export default function Home() {
  const { ready, authenticated, login } = usePrivy();

  // fold-fit (from landing sim): scale hero stage so the stats strip lands above the fold
  useEffect(() => {
    function fit() {
      const strip = document.querySelector(".strip") as HTMLElement | null;
      const wrap = document.querySelector(".mascot-wrap") as HTMLElement | null;
      const pv = document.querySelector(".pv") as HTMLElement | null;
      const hint = document.querySelector(".scrollhint") as HTMLElement | null;
      if (!strip || !wrap || !pv) return;
      if (innerWidth < 900) return;
      const vh = window.innerHeight;
      wrap.style.width = "";
      pv.style.height = "";
      pv.style.marginTop = "";
      if (hint) hint.style.display = "";
      const card = document.querySelector(".stage .pv-card") as HTMLElement | null;
      if (!card) return;
      card.style.transform = "";
      card.style.transformOrigin = "center top";
      const H0 = card.getBoundingClientRect().height;
      const baseW = wrap.getBoundingClientRect().width || 290;
      let okStrip = false;
      let f = 1;
      const place = (sc: number) => {
        wrap.style.width = Math.round(baseW * sc) + "px";
        document.querySelectorAll(".stage .float").forEach((fl) => {
          const e = fl as HTMLElement;
          e.style.opacity = sc <= 0.6 ? "0" : "";
          e.style.pointerEvents = sc <= 0.6 ? "none" : "";
        });
        card.style.transform = sc < 0.995 ? "scale(" + sc + ")" : "";
        pv.style.height = Math.round(H0 * sc) + "px";
      };
      for (let i = 0; i < 10; i++) {
        place(f);
        if (strip.getBoundingClientRect().bottom <= vh - 8) { okStrip = true; break; }
        f -= 0.07;
        if (f < 0.45) { f = 0.45; place(f); okStrip = strip.getBoundingClientRect().bottom <= vh - 8; break; }
      }
      if (!okStrip) place(0.45);
      if (!okStrip && hint) hint.style.display = "none";
    }
    fit();
    document.documentElement.classList.add("home-landing");
    const t = setTimeout(fit, 150);
    window.addEventListener("resize", fit);
    return () => { clearTimeout(t); window.removeEventListener("resize", fit); document.documentElement.classList.remove("home-landing"); };
  }, []);

  return (
    <div className="home-landing">
    <div className="screen">
      <nav>
        <div className="logo"><img className="mark" src="/assets/mytips-icon.png" alt="" /><span>MY<span style={{color:"#7c3aed"}}>TIPS</span></span></div>
        <div className="navlinks"><a href="#how-it-works">How it works</a><a href="https://github.com/jinkatama105" target="_blank" rel="noopener noreferrer">GitHub</a><span className="monchip"><MonPrice compact /></span></div>
        <div className="navbtns">
          {ready && !authenticated ? (
            <button className="btn btn-outline" onClick={login}>Login</button>
          ) : (
            <Link href="/send" className="btn btn-outline">Dashboard</Link>
          )}
          <Link href="/send" className="btn btn-primary">Send a gift</Link>
        </div>
      </nav>

      <div className="hero-copy">
        <span className="eyebrow">Onchain gifts</span>
        <h1>Send a gift.<br /><span style={{color:"#7c3aed"}}>Make it remembered.</span></h1>
        <p className="subshort">MON to any wallet — video and message attached. One link, anywhere.</p>
        <div className="herobtns" style={{display:"flex",gap:"12px",marginTop:"18px",justifyContent:"center"}}>
          <Link className="btn btn-primary" href="/send">Send a gift</Link>
          <a className="btn btn-outline" href="#how-it-works">How it works</a>
        </div>
        <a className="scrollhint" href="#proof" style={{textDecoration:"none"}}>Explore<span className="arrow">↓</span></a>
      </div>

      <div className="stage">
        {/* mascot cluster */}
        <div className="mascot-zone">
          <div className="float f-btc1"><img src="/assets/coin_btc.png" alt="" /></div>
          <div className="float f-btc2"><img src="/assets/coin_eth.png" alt="" /></div>
          <div className="float f-btc3"><img src="/assets/coin_usdt.png" alt="" /></div>
          <div className="float f-eth"><img src="/assets/coin_mon.png" alt="" style={{borderRadius:"50%"}} /></div>
          <div className="float f-yt"><img src="/assets/tile_youtube.png" alt="" /></div>
          <div className="float f-x"><img src="/assets/icon_xtwitter.png" alt="" /></div>
          <div className="mascot-wrap">
            <div className="orbit"><div className="spinner">
          <div className="oi" style={{left:"50.0%",top:"8.0%"}}><div className="in"><img src="/assets/coin_mon.png" alt="" style={{borderRadius:"50%"}} /></div></div>
          <div className="oi" style={{left:"81.3%",top:"23.8%"}}><div className="in"><img src="/assets/tile_youtube.png" alt="" style={{borderRadius:"14px"}} /></div></div>
          <div className="oi" style={{left:"89.0%",top:"59.3%"}}><div className="in"><img src="/assets/coin_btc.png" alt="" style={{borderRadius:"14px"}} /></div></div>
          <div className="oi" style={{left:"67.4%",top:"87.8%"}}><div className="in"><img src="/assets/icon_xtwitter.png" alt="" style={{borderRadius:"14px"}} /></div></div>
          <div className="oi" style={{left:"32.6%",top:"87.8%"}}><div className="in"><img src="/assets/coin_eth.png" alt="" style={{borderRadius:"14px"}} /></div></div>
          <div className="oi" style={{left:"11.0%",top:"59.3%"}}><div className="in"><img src="/assets/tile_tiktok.png" alt="" style={{borderRadius:"14px"}} /></div></div>
          <div className="oi" style={{left:"18.7%",top:"23.8%"}}><div className="in"><img src="/assets/coin_usdt.png" alt="" style={{borderRadius:"14px"}} /></div></div>
            </div></div>
            <img className="mascot" src="/assets/mascot_hold_web.png" alt="MyTips mascot pointing at the gift card" />
          </div>
          <span className="spark" style={{right:"24%",top:"34%"}}>✦</span>
          <span className="spark" style={{left:"26%",bottom:"6%",color:"#ec4899",animationDelay:".7s"}}>✦</span>
          <span className="spark" style={{left:"38%",top:"2%",color:"#f59e0b",animationDelay:"1.3s",fontSize:"14px"}}>✦</span>
        </div>

        {/* middle icon column */}
        <div className="col-icons">
          <img src="/assets/tile_youtube.png" alt="YouTube" />
          <img src="/assets/tile_tiktok.png" alt="TikTok" />
          <img src="/assets/coin_mon.png" alt="$MON" style={{borderRadius:"50%"}} />
        </div>

        {/* preview card */}
        <div className="pv">
          <div className="pv-card">
            <div className="video">
              <img src="/assets/vid_thumb.png" alt="gift video" />
              <img className="corner-x" src="/assets/icon_xtwitter.png" alt="" />
              <img className="corner-yt" src="/assets/tile_youtube.png" alt="" />
              <img className="edge-tt" src="/assets/tile_tiktok.png" alt="" />
              <div className="playc"><div>▶</div></div>
              <div className="vbar"><span>▶</span><div className="prog"></div><span>🔊</span><span>▦</span><span>⛶</span></div>
            </div>
            <div className="rows">
              <div className="row">
                <div className="av ok">✓</div>
                <div className="mid"><b>Transaction Sent!</b><span>0x71c...3a4f</span></div>
                <div className="end"><span className="amt">+0.05 MON</span><br /><span className="usd">$5.00</span></div>
              </div>
              <div className="row">
                <div className="av vio">🎁</div>
                <div className="mid"><b>Gift Attached!</b><span>0x71c...3a4f</span></div>
                <div className="end"><img src="/assets/icon_gift_sm_clear.png" alt="gift" style={{borderRadius:"0"}} /></div>
              </div>
              <div className="row">
                <div className="av tea">👤</div>
                <div className="mid"><b>Recipient</b><span>0x71c...3a4f</span></div>
                <div className="end"><span className="amt">+0.05 MON</span><br /><span className="usd">$5.00</span></div>
              </div>
              <div className="msglbl">Your Message</div>
              <div className="msg">"thank you always bro, i hope you have a happy life"</div>
            </div>
          </div>
        </div>

      </div>

      <div className="strip" id="proof">
        <div className="st"><b>6</b><span>video platforms</span></div>
        <div className="st"><b>1</b><span>shareable page</span></div>
        <div className="st"><b>0</b><span>signups · escrow · custody</span></div>
        <div className="st"><b>∞</b><span>lives onchain</span></div>
      </div>

    </div>

    <div className="page">
    <section className="sect">
      <h2>Everything a gift needs.</h2>
      <p className="lead">From the first transfer to the moment it's shared, every part stays connected.</p>
      <div className="feat">
        <div className="f"><div className="ic">💠</div><h3>Send</h3><p>Native MON to any wallet, or attach an existing transaction hash. No signup, no custody.</p></div>
        <div className="f"><div className="ic">▶️</div><h3>Watch</h3><p>YouTube, TikTok, X, Instagram, Facebook, or a direct link — plays right on the gift page.</p></div>
        <div className="f"><div className="ic">✉️</div><h3>Message</h3><p>Type a greeting. It shows beside the video — and can be read aloud as a voice-over.</p></div>
        <div className="f"><div className="ic">🔗</div><h3>Share</h3><p>One link renders with a live preview in X, Telegram, and WhatsApp.</p></div>
      </div>
    </section>

    <section id="how-it-works" className="sect" style={{paddingTop:"20px"}}>
      <h2>How it works.</h2>
      <p className="lead">From the first transfer to a link worth opening, each step moves the gift forward.</p>
      <div className="steps">
        <div className="s"><div className="n">1</div><h3>Send or attach</h3><p>Transfer native MON to any wallet — or paste an existing transaction hash to build the gift around it.</p></div>
        <div className="s"><div className="n">2</div><h3>Add video + message</h3><p>Paste a YouTube, TikTok, X, or Instagram link and type a short greeting. It can be read aloud as a voice-over.</p></div>
        <div className="s"><div className="n">3</div><h3>Share the page</h3><p>One link shows the video, your message, and the transaction — with a live preview in X, Telegram, and WhatsApp.</p></div>
      </div>
    </section>
    </div>

    <div className="page">
    <section className="sect">
      <h2>What the receiver sees.</h2>
      <p className="lead">The gift card — transaction, video, and message in one page. This is a real preview.</p>
      <div style={{display:"flex",justifyContent:"center"}}>
        <div className="pv-card" style={{margin:"0",maxWidth:"380px"}}>
            <div className="video">
              <img src="/assets/vid_thumb.png" alt="gift video" />
              <img className="corner-x" src="/assets/icon_xtwitter.png" alt="" />
              <img className="corner-yt" src="/assets/tile_youtube.png" alt="" />
              <img className="edge-tt" src="/assets/tile_tiktok.png" alt="" />
              <div className="playc"><div>▶</div></div>
              <div className="vbar"><span>▶</span><div className="prog"></div><span>🔊</span><span>▦</span><span>⛶</span></div>
            </div>
            <div className="rows">
              <div className="row">
                <div className="av ok">✓</div>
                <div className="mid"><b>Transaction Sent!</b><span>0x71c...3a4f</span></div>
                <div className="end"><span className="amt">+0.05 MON</span><br /><span className="usd">$5.00</span></div>
              </div>
              <div className="row">
                <div className="av vio">🎁</div>
                <div className="mid"><b>Gift Attached!</b><span>0x71c...3a4f</span></div>
                <div className="end"><img src="/assets/icon_gift_sm_clear.png" alt="gift" style={{borderRadius:"0"}} /></div>
              </div>
              <div className="row">
                <div className="av tea">👤</div>
                <div className="mid"><b>Recipient</b><span>0x71c...3a4f</span></div>
                <div className="end"><span className="amt">+0.05 MON</span><br /><span className="usd">$5.00</span></div>
              </div>
              <div className="msglbl">Your Message</div>
              <div className="msg">"thank you always bro, i hope you have a happy life"</div>
            </div>
          </div>
      </div>
    </section>
    </div>

    <div className="page">
    <section className="sect" style={{maxWidth:"720px"}}>
      <h2 style={{marginBottom:"30px"}}>Straight answers.</h2>
      <details open><summary>Is MyTips a wallet or an exchange? <span className="pm">+</span></summary><div className="a">Neither. MyTips is a presentation layer: the MON moves through normal onchain transfers. We never hold your funds.</div></details>
      <details><summary>How long does a gift page live? <span className="pm">+</span></summary><div className="a">As long as the chain does. The transaction is onchain forever; the gift page references it, so the moment is never lost to a deleted chat.</div></details>
      <details><summary>What does it cost? <span className="pm">+</span></summary><div className="a">Just the network gas for your transfer. Creating and sharing the gift page is free.</div></details>
      <details><summary>Which platforms can the video come from? <span className="pm">+</span></summary><div className="a">YouTube, TikTok, X, Instagram, Facebook, or any direct video link.</div></details>
    </section>
    </div>

    <div className="page">
    <div className="cta-band">
      <h2>Someone deserves a gift today.</h2>
      <p>Send MON. Attach the moment. Share one link.</p>
      <Link className="btn btn-primary" href="/send" style={{fontSize:"15px",padding:"14px 30px"}}>Send a gift</Link>
    </div>

    <footer className="foot">Mainnet · built for the Metropolis hackathon</footer>
    </div>
    </div>

  );
}
