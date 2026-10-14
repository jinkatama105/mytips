# MYTIPS

**Send a gift. Make it remembered.** 🎁

MYTIPS turns MON into memorable on-chain gifts: attach a personal message read aloud by AI and a favorite YouTube moment, wrapped in a beautiful gift page shareable with one link — live on **Monad mainnet**.

`https://mytips.fun` · `https://mytips.fun/tx/0x…?v=<video>&msg=<message>`

## The problem

Crypto transfers are boring and forgettable. There's no joy in sending MON — just an address, a hash, a confirm. Meanwhile, "send a tip" moments (birthday, achievement, a great stream) are emotional moments that deserve better than a raw tx.

## What MYTIPS does

1. **Attach a moment** — a YouTube video (any moment, any link) + a personal message
2. **Wrap it as a gift** — a beautiful lavender gift card with your video front and center
3. **Make it speak** — the AI voice assistant reads your message aloud (smart language detection, Indonesian included)
4. **Share one link** — receiver opens it, sees the live on-chain tx confirmed, hears your message, watches the video. No account needed.

## Demo

**Watch the 2:22 walkthrough**
[▶ mytips-demo.mp4](https://github.com/jinkatama105/mytips/raw/main/mytips-demo.mp4) · [YouTube Shorts](https://youtube.com/shorts/slk9rta-72g)

Live site: **[mytips.fun](https://mytips.fun)**

## One-liner

> MYTIPS turns MON into memorable gifts on Monad — attach a personal message read aloud by AI plus a favorite YouTube moment, wrapped in a beautiful on-chain gift page shareable with a single link.

## Features

- **Send gift** — transfer MON to any wallet via connected wallet (Privy), or paste an existing tx hash
- **Custom message + AI voice** — the gift page speaks your message (TTS with smart language detection, Indonesian slang-aware)
- **Video attach** — YouTube (with start/end time), TikTok, X, Instagram, Facebook (shortlinks resolved server-side), direct video URLs
- **AI gift concierge** — describe the occasion ("birthday for my guitar buddy"), get 3 curated video-gift ideas with a ready-to-send message, powered by Qwen (qwen3.6-flash via Token Plan, server-side)
- **Rich link previews** — `og:` / `twitter:card` images generated per platform, incl. proxy for expiring CDN thumbnails
- **MON price ticker** — live USD price in header
- **Short links** — `/g/<slug>` branded share link redirecting to the gift page (used for social sharing)

## Chains

| Environment | Chain | How |
|---|---|---|
| Production (`mytips.fun`) | **Monad Mainnet** (143) | default in prod build |
| Local dev | **Monad Testnet** (10143) | `npm run dev` |
| Force either | override `NEXT_PUBLIC_CHAIN=testnet\|mainnet` | e.g. `NEXT_PUBLIC_CHAIN=mainnet npm run dev` |

Tx lookups on the share page query both chains automatically, so old testnet links keep working after the mainnet switch.

## Extras

`contracts/src/TipJar.sol` — an earlier prototype for streamer tip jars (register handle, tip by handle, withdraw). Deployed on Monad testnet (`0xf98a5e2832b52dba20ff92d1119be44201192f27`); the mainnet product flow (gift pages) does not depend on it.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Privy (wallet auth) + wagmi/viem
- Vercel (hosting, edge OG image proxy)
- Domain: `mytips.fun`

## Local development

```bash
npm install
npm run dev          # testnet mode automatically (dev)
```

Required env (see `.env.example`): `NEXT_PUBLIC_PRIVY_APP_ID`.

## Deploy

```bash
vercel deploy --prod
```

Production uses mainnet by default; Vercel env `NEXT_PUBLIC_CHAIN=mainnet` pins it explicitly.

---

Built with ❤️ for the **Monad Metropolis hackathon**.