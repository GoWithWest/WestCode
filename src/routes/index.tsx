import { createFileRoute } from "@tanstack/react-router";
import { HelixApp } from "@/components/helix/helix-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <HelixApp />;
}
