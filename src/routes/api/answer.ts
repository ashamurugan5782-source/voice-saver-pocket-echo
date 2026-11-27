import { createFileRoute } from "@tanstack/react-router";
import { handleAnswer } from "@/lib/answer.server";

export const Route = createFileRoute("/api/answer")({
  server: { handlers: { POST: ({ request }) => handleAnswer(request) } },
});
