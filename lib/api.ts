import type { AskResult } from "./types";

export function segmentAnswer(answer: string) {
	return answer.split(/(\{\{cite:\d+\}\})/g).filter(Boolean).map((value) => {
		const match = value.match(/^\{\{cite:(\d+)\}\}$/);
		return match ? { kind: "citation" as const, n: Number(match[1]) } : { kind: "text" as const, value };
	});
}

export async function askQuestion(query: string, lang: "en" | "ur", signal?: AbortSignal) {
	const response = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, lang }), signal });
	if (!response.ok || !response.body) throw new Error("The verification service is unavailable.");
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	let streamed = "";
	let result: AskResult | null = null;
	const consume = (chunk: string) => {
		buffer += chunk;
		const events = buffer.split("\n\n");
		buffer = events.pop() ?? "";
		for (const event of events) {
			const eventName = event.match(/^event: (.+)$/m)?.[1];
			const data = event.match(/^data: (.+)$/m)?.[1];
			if (!eventName || !data) continue;
			const payload = JSON.parse(data) as { text?: string; message?: string } & Partial<AskResult>;
			if (eventName === "text") streamed += payload.text ?? "";
			if (eventName === "result") result = payload as AskResult;
			if (eventName === "error") throw new Error(payload.message ?? "The verification service failed.");
		}
	};
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		consume(decoder.decode(value, { stream: true }));
	}
	if (!result) throw new Error("The verification service returned no answer.");
	const completed = result as AskResult;
	return { answer: completed.answer, confidence: completed.confidence, citations: completed.citations, streamed };
}
