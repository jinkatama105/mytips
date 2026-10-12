// Server-side gift history (Supabase REST, no SDK needed).
// Anon key is public by design — RLS blocks direct reads; reads go through
// the get_gifts(addr) RPC, writes are validated by policy (0x wallet + 66-char hash).

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export type GiftRow = {
  wallet: string;
  tx_hash: string;
  to_addr: string;
  amount: string;
  video_url: string;
  share_link: string;
  created_at?: string;
};

const headers = {
  apikey: KEY ?? "",
  Authorization: `Bearer ${KEY ?? ""}`,
  "Content-Type": "application/json",
};

export function historyEnabled() {
  return !!(URL && KEY);
}

export async function pushGift(g: GiftRow) {
  if (!historyEnabled()) return false;
  try {
    const r = await fetch(`${URL}/rest/v1/rpc/upsert_gift`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        addr: g.wallet,
        hash: g.tx_hash,
        to_a: g.to_addr,
        amt: g.amount,
        vid: g.video_url,
        link: g.share_link,
      }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export async function fetchGifts(addr: string): Promise<GiftRow[]> {
  if (!historyEnabled() || !addr) return [];
  try {
    const r = await fetch(`${URL}/rest/v1/rpc/get_gifts`, {
      method: "POST",
      headers,
      body: JSON.stringify({ addr }),
    });
    if (!r.ok) return [];
    return (await r.json()) as GiftRow[];
  } catch {
    return [];
  }
}

export async function removeGift(addr: string, hash: string) {
  if (!historyEnabled()) return;
  try {
    await fetch(`${URL}/rest/v1/rpc/delete_gift`, {
      method: "POST",
      headers,
      body: JSON.stringify({ addr, hash }),
    });
  } catch {}
}

export async function removeAllGifts(addr: string) {
  if (!historyEnabled()) return;
  try {
    await fetch(`${URL}/rest/v1/rpc/clear_gifts`, {
      method: "POST",
      headers,
      body: JSON.stringify({ addr }),
    });
  } catch {}
}
