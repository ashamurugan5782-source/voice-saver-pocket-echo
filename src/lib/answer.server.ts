import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const INSTRUCTIONS = `You are Voice Seve, a friendly helper for electricity bill questions for households in Tamil Nadu, India (TNPDCL/TANGEDCO context).
Help with: reading the bill, units and tariff slabs, due dates, late fees, paying online, disconnection/reconnection, meter issues, new connections and complaints.
Reply in the SAME language the user used (Tamil script for Tamil, English for English).
Keep answers short (2-5 sentences), plain, and easy to listen to. No markdown, no bullet symbols.
If rates may have changed, say so and suggest checking the official TNPDCL website or calling 94987 94987.
If the question is not about electricity bills or power supply, politely say you only help with electricity bills.`;

export async function handleAnswer(request: Request) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return Response.json({ error: "AI is not configured." }, { status: 500 });
  let question = "";
  let lang = "en";
  try {
    const body = (await request.json()) as { question?: unknown; lang?: unknown };
    question = typeof body.question === "string" ? body.question.trim().slice(0, 1000) : "";
    lang = body.lang === "ta" ? "ta" : "en";
  } catch {
    /* ignore */
  }
  if (!question) return Response.json({ error: "Please ask a question." }, { status: 400 });

  const runIdHeader = request.headers.get("X-Lovable-AIG-Run-ID") ?? undefined;
  let runId = runIdHeader;
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has("X-Lovable-AIG-Run-ID")) headers.set("X-Lovable-AIG-Run-ID", runId);
      const res = await fetch(input, { ...init, headers });
      runId ??= res.headers.get("X-Lovable-AIG-Run-ID") ?? undefined;
      return res;
    },
  });

  let failure: { status: number; message: string } | null = null;
  const result = streamText({
    model: provider.responses("openai/gpt-6.1-sol"),
    instructions: INSTRUCTIONS + `\nThe user selected ${lang === "ta" ? "Tamil" : "English"}.`,
    messages: [{ role: "user", content: question }],
    abortSignal: request.signal,
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
    onError: ({ error }) => {
      const e = error as { statusCode?: number; message?: string };
      failure = { status: e.statusCode ?? 500, message: e.message ?? "AI request failed." };
    },
  });

  try {
    const text = await result.text;
    if (failure) throw failure;
    if (!text.trim()) return Response.json({ error: "No answer was returned." }, { status: 502 });
    return Response.json({ answer: text.trim() });
  } catch (err) {
    const f = (failure ?? err) as { status?: number; statusCode?: number; message?: string };
    const status = f.status ?? f.statusCode ?? 500;
    const message =
      status === 402 ? "AI credits have run out. Please add credits to continue." :
      status === 429 ? "Too many requests. Please wait a moment and try again." :
      f.message ?? "Something went wrong.";
    return Response.json({ error: message }, { status });
  }
}
