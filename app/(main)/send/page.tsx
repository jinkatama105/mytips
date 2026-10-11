import type { Metadata } from "next";
import SendClient from "./send-client";

export const metadata: Metadata = {
  title: "Send a gift with a video — MYTIPS",
  description:
    "Send MON to a friend, attach a YouTube video, and share the link — the video shows right in the social preview card.",
};

export default function SendPage() {
  return <SendClient />;
}
