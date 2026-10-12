# MYTIPS

**Send onchain gifts with a video.**

Send native MON on Monad to any wallet (or attach any existing transaction hash), add a YouTube / TikTok / X / Instagram / Facebook / direct video link, and get one shareable gift page:

`https://mytips.fun/tx/0x…?v=<video>`

The page autoplays the video with the transaction details, and the link renders as a rich preview card (thumbnail + video) on X, Telegram, and WhatsApp.

## Features

- **Send gift** — transfer MON to any address via connected wallet, or paste an existing tx hash
- **Video attach** — YouTube (with start/end time & link timestamps), TikTok, X, Instagram, Facebook (share shortlinks resolved server-side), direct video URLs
- **Shareable gift page** — video + onchain tx card, receiver can unmute, optional autoplay toggle
- **Rich link previews** — `og:` / `twitter:card` images generated per platform, incl. proxy for expiring CDN thumbnails
- **MON price ticker** — live USD price in the header

## Chains

| Environment | Chain | How |
|---|---|---|
| Production (`mytips.fun`) | **Monad Mainnet** (143) | default in prod build |
| Local dev | **Monad Testnet** (10143) | `npm run dev` |
| Force either | override with `NEXT_PUBLIC_CHAIN=testnet\|mainnet` | e.g. test mainnet locally: `NEXT_PUBLIC_CHAIN=mainnet npm run dev` |

Tx lookups on the share page query both chains automatically, so old testnet links keep working after the mainnet switch.

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
Built for the Monad Metropolis hackathon.
