import { ChatPageClient } from "@/components/ChatPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Chat - MyCalendarStats",
  description: "Chat with AI about your calendar and statistics.",
};

export default function ChatPage() {
  return <ChatPageClient />;
}
