import { z } from "zod";

const SUNNAH_API_URL = process.env.NEXT_PUBLIC_SUNNAH_API_URL;

const bodySchema = z.object({
  query: z.string().trim().min(1).max(1000),
  lang: z.enum(["en", "ur"]),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    console.log("[Sunnah API] Rejected invalid request.", parsed.error.flatten());
    return Response.json(
      { message: "Send a question between 1 and 1000 characters." },
      { status: 400 },
    );
  }

  if (!SUNNAH_API_URL) {
    console.log("[Sunnah API] Missing NEXT_PUBLIC_SUNNAH_API_URL.");
    return Response.json(
      { message: "The Sunnah service is not configured." },
      { status: 503 },
    );
  }

  const startedAt = Date.now();
  console.log("[Sunnah API] Sending request to backend.", {
    url: SUNNAH_API_URL,
    language: parsed.data.lang,
    queryLength: parsed.data.query.length,
  });

  try {
    const upstream = await fetch(SUNNAH_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(30_000),
    });

    console.log("[Sunnah API] Backend responded.", {
      status: upstream.status,
      durationMs: Date.now() - startedAt,
    });

    if (!upstream.ok) {
      const errorBody = (await upstream.text()).slice(0, 1000);
      console.log("[Sunnah API] Backend error response.", { body: errorBody });
      return Response.json(
        { message: "The Sunnah service returned an error." },
        { status: 502 },
      );
    }

    const data: unknown = await upstream.json();
    console.log("[Sunnah API] Parsed backend response.", {
      responseType: typeof data,
      responseKeys: data && typeof data === "object" ? Object.keys(data) : [],
      answerLength:
        data && typeof data === "object" && "answer" in data && typeof data.answer === "string"
          ? data.answer.length
          : null,
      sourceCount:
        data && typeof data === "object" && "sources" in data && Array.isArray(data.sources)
          ? data.sources.length
          : null,
    });
    return Response.json(data);
  } catch (cause) {
    console.log("[Sunnah API] Backend request failed.", {
      durationMs: Date.now() - startedAt,
      error: cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause),
    });
    return Response.json(
      { message: "Could not connect to the Sunnah service." },
      { status: 502 },
    );
  }
}
