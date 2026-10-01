"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { LoaderCircle, Mic, Send, Volume2, Waves } from "lucide-react";
import { askAquaShield } from "@/lib/api/assistant";
import type { AssistantAction, AssistantQuery } from "@/types/assistant";
import type { LocationPoint } from "@/types/location";

type Message = { role: "user" | "assistant"; text: string; status?: "model_output" | "demo" };
type VoiceState = "idle" | "listening" | "processing" | "speaking";
type Props = { location: LocationPoint | null; layer: string; period: string; scenario: string; onAction: (action: AssistantAction) => void };
type RecognitionResult = ArrayLike<{ transcript: string }>;
type RecognitionEvent = { results: ArrayLike<RecognitionResult> };
type RecognitionInstance = {
  lang: string;
  interimResults: boolean;
  onstart: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
  start: () => void;
};
type RecognitionConstructor = new () => RecognitionInstance;
type SpeechWindow = Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };

export function AssistantPanel({ location, layer, period, scenario, onAction }: Props) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: "Select a place on the map, then ask about its groundwater. I’ll include the selected coordinates with your question." }]);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [error, setError] = useState("");
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => {
    controllerRef.current?.abort();
    window.speechSynthesis?.cancel();
  }, []);

  async function ask(question: string) {
    const cleanQuestion = question.trim();
    if (!cleanQuestion || voiceState === "processing") return;
    setInput("");
    setError("");
    setMessages((current) => [...current, { role: "user", text: cleanQuestion }]);
    setVoiceState("processing");
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const payload: AssistantQuery = {
      message: cleanQuestion,
      ...(location ? { latitude: location.latitude, longitude: location.longitude, locationLabel: location.label } : {}),
      selectedLayer: layer,
      period,
      scenario,
    };
    try {
      const reply = await askAquaShield(payload, controller.signal);
      setMessages((current) => [...current, { role: "assistant", text: reply.answer, status: reply.status }]);
      reply.actions?.forEach(onAction);
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      const text = "Assistant service is not connected yet. Your question and selected location are ready to send when the backend endpoint is configured.";
      setMessages((current) => [...current, { role: "assistant", text }]);
      setError("AI service unavailable");
    } finally {
      if (!controller.signal.aborted) setVoiceState("idle");
    }
  }

  function submit(event: FormEvent) { event.preventDefault(); void ask(input); }

  function startVoice() {
    const speechWindow = window as SpeechWindow;
    const BrowserRecognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!BrowserRecognition) { setError("Voice input is not supported here. Type your question instead."); return; }
    setError("");
    const recognition = new BrowserRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.onstart = () => setVoiceState("listening");
    recognition.onerror = () => { setVoiceState("idle"); setError("I could not hear that. Please try again or type your question."); };
    recognition.onend = () => setVoiceState((current) => current === "listening" ? "idle" : current);
    recognition.onresult = (event) => { const transcript = event.results[0]?.[0]?.transcript; if (transcript) { setInput(transcript); void ask(transcript); } };
    recognition.start();
  }

  function speak(text: string) {
    if (!window.speechSynthesis) { setError("Spoken responses are not supported in this browser."); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    utterance.onstart = () => setVoiceState("speaking");
    utterance.onend = () => setVoiceState("idle");
    utterance.onerror = () => { setVoiceState("idle"); setError("Could not play the spoken response."); };
    window.speechSynthesis.speak(utterance);
  }

  const voiceLabel: Record<VoiceState, string> = { idle: "Ready", listening: "Listening… speak now", processing: "Processing your question…", speaking: "Speaking response…" };

  return (
    <section className="research-card assistant-card" aria-labelledby="assistant-title">
      <header className="research-card-heading"><span className="panel-icon"><Waves size={17} /></span><div><h2 id="assistant-title">AquaShield AI</h2><p>Ask about the selected place</p></div></header>
      {location && <div className="assistant-context"><span>Using map context</span><strong>{location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°</strong></div>}
      <div className="assistant-transcript" aria-live="polite" aria-relevant="additions text">
        {messages.map((message, index) => <article className={`chat-message ${message.role}`} key={`${message.role}-${index}`}><span className="chat-role">{message.role === "user" ? "YOU" : "AQUASHIELD"}{message.status ? ` · ${message.status.replace("_", " ").toUpperCase()}` : ""}</span><p>{message.text}</p>{message.role === "assistant" && index > 0 && <button className="speak-answer" onClick={() => speak(message.text)} aria-label="Read this answer aloud"><Volume2 size={14} /> Read aloud</button>}</article>)}
      </div>
      <div className={`voice-status voice-${voiceState}`} role="status" aria-live="assertive">{voiceState === "listening" && <span className="recording-dot" />}{voiceState === "processing" && <LoaderCircle className="spin-icon" size={14} />}{voiceState === "speaking" && <Volume2 size={14} />}{voiceLabel[voiceState]}</div>
      {error && <p className="inline-status" role="alert">{error}</p>}
      <form className="assistant-compose" onSubmit={submit}>
        <button type="button" className={`mic-button ${voiceState === "listening" ? "is-listening" : ""}`} onClick={startVoice} disabled={voiceState === "processing" || voiceState === "speaking"} aria-label={voiceState === "listening" ? "Listening for your question" : "Ask by voice"} aria-pressed={voiceState === "listening"}><Mic size={17} /></button>
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Type your groundwater question…" aria-label="Type a groundwater question" />
        <button type="submit" className="send-button" disabled={!input.trim() || voiceState === "processing"} aria-label="Send question"><Send size={16} /></button>
      </form>
      <p className="assistant-footnote">Questions include selected coordinates when available. Answers require the team API.</p>
    </section>
  );
}
