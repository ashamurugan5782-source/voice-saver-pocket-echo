import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Mic, Square, Volume2, Send, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Voice Seva — Electricity bill help by voice" },
      { name: "description", content: "Ask electricity bill questions by voice in Tamil or English and hear the answer." },
      { property: "og:title", content: "Voice Seva — Electricity bill help by voice" },
      { property: "og:description", content: "Speak your electricity bill question in Tamil or English. Read and hear the answer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Lang = "ta" | "en";
const T = {
  en: { tap: "Tap to speak", listening: "Listening… tap to stop", thinking: "Finding the answer…", you: "You asked", answer: "Answer", type: "Or type your question", replay: "Read again", noMic: "Voice input isn't supported in this browser. Please type your question.", examples: ["How do I pay my bill online?", "What is the late fee?", "Why is my bill so high?"] },
  ta: { tap: "பேச தட்டவும்", listening: "கேட்கிறது… நிறுத்த தட்டவும்", thinking: "பதில் தேடுகிறது…", you: "உங்கள் கேள்வி", answer: "பதில்", type: "அல்லது கேள்வியை தட்டச்சு செய்யவும்", replay: "மீண்டும் படிக்க", noMic: "இந்த உலாவியில் குரல் உள்ளீடு இல்லை. கேள்வியை தட்டச்சு செய்யவும்.", examples: ["மின் கட்டணத்தை ஆன்லைனில் எப்படி செலுத்துவது?", "தாமத கட்டணம் எவ்வளவு?", "என் பில் ஏன் அதிகமாக உள்ளது?"] },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Recognition = any;

function Index() {
  const [lang, setLang] = useState<Lang>("ta");
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [typed, setTyped] = useState("");
  const [supported, setSupported] = useState(true);
  const recRef = useRef<Recognition>(null);
  const t = T[lang];

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    setSupported(Boolean(w["SpeechRecognition"] || w["webkitSpeechRecognition"]));
    return () => window.speechSynthesis?.cancel();
  }, []);

  function speak(text: string, l: Lang) {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = l === "ta" ? "ta-IN" : "en-IN";
    const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(l));
    if (voice) u.voice = voice;
    synth.speak(u);
  }

  async function ask(q: string) {
    const text = q.trim();
    if (!text) return;
    setQuestion(text);
    setAnswer("");
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, lang }),
      });
      const data = (await res.json()) as { answer?: string; error?: string };
      if (!res.ok || !data.answer) throw new Error(data.error ?? "Something went wrong.");
      setAnswer(data.answer);
      speak(data.answer, lang);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function toggleMic() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const w = window as unknown as Record<string, new () => Recognition>;
    const SR = w["SpeechRecognition"] || w["webkitSpeechRecognition"];
    if (!SR) { setSupported(false); return; }
    window.speechSynthesis?.cancel();
    const rec = new SR();
    rec.lang = lang === "ta" ? "ta-IN" : "en-IN";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    rec.onresult = (e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => {
      let s = "";
      for (let i = 0; i < e.results.length; i++) s += e.results[i]?.[0]?.transcript ?? "";
      finalText = s;
      setQuestion(s);
    };
    rec.onerror = (e: { error: string }) => { if (e.error !== "no-speech" && e.error !== "aborted") setError(`Mic error: ${e.error}`); };
    rec.onend = () => { setListening(false); if (finalText) void ask(finalText); };
    recRef.current = rec;
    setError("");
    setAnswer("");
    setQuestion("");
    setListening(true);
    rec.start();
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 font-sans text-foreground">
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-full bg-secondary text-secondary-foreground"><Zap className="size-5" /></span>
            <div>
              <h1 className="text-2xl font-extrabold leading-none">Voice Seva</h1>
              <p className="text-sm text-muted-foreground">{lang === "ta" ? "மின் கட்டண உதவி" : "Electricity bill help"}</p>
            </div>
          </div>
          <div className="flex rounded-full bg-muted p-1 text-sm font-semibold">
            {(["ta", "en"] as Lang[]).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`rounded-full px-4 py-1.5 transition ${lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                {l === "ta" ? "தமிழ்" : "English"}
              </button>
            ))}
          </div>
        </header>

        <section className="flex flex-col items-center gap-4 rounded-[var(--radius)] bg-primary px-6 py-10 text-primary-foreground shadow-card">
          <button onClick={toggleMic} disabled={loading || !supported} aria-label={listening ? "Stop" : "Speak"}
            className={`grid size-28 place-items-center rounded-full bg-secondary text-secondary-foreground transition hover:scale-105 disabled:opacity-50 ${listening ? "animate-pulse-ring" : ""}`}>
            {listening ? <Square className="size-10" /> : <Mic className="size-12" />}
          </button>
          <p className="text-lg font-semibold">{loading ? t.thinking : listening ? t.listening : t.tap}</p>
          {!supported && <p className="text-center text-sm opacity-80">{t.noMic}</p>}
        </section>

        <form onSubmit={(e) => { e.preventDefault(); void ask(typed); setTyped(""); }} className="flex gap-2">
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={t.type}
            className="flex-1 rounded-full border border-input bg-card px-5 py-3 outline-none focus:ring-2 focus:ring-ring" />
          <button disabled={loading || !typed.trim()} aria-label="Send" className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"><Send className="size-5" /></button>
        </form>

        {!question && !answer && (
          <div className="flex flex-wrap gap-2">
            {t.examples.map((ex) => (
              <button key={ex} onClick={() => void ask(ex)} className="rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-muted">{ex}</button>
            ))}
          </div>
        )}

        {question && (
          <div className="rounded-[var(--radius)] bg-muted p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{t.you}</p>
            <p className="text-lg">{question}</p>
          </div>
        )}
        {error && <p className="rounded-[var(--radius)] bg-destructive/10 p-4 text-destructive">{error}</p>}
        {answer && (
          <div className="rounded-[var(--radius)] border-l-4 border-secondary bg-card p-5 shadow-card">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{t.answer}</p>
              <button onClick={() => speak(answer, lang)} className="flex items-center gap-1 text-sm font-semibold text-primary"><Volume2 className="size-4" />{t.replay}</button>
            </div>
            <p className="whitespace-pre-line text-lg leading-relaxed">{answer}</p>
          </div>
        )}
      </div>
    </main>
  );
}
