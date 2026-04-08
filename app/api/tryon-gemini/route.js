import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// Allow up to 60s on Vercel Pro; Hobby plan caps at 10s
export const maxDuration = 60;

const GEMINI_MODEL = "gemini-2.5-flash-image";

export async function POST(request) {
  try {
    const { collageImage } = await request.json();

    if (!collageImage) {
      return NextResponse.json(
        { error: "Missing collageImage" },
        { status: 400 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 },
      );
    }

    // ── Strip data URL prefix ─────────────────────────────────────────────────
    const collageMatch = collageImage.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!collageMatch) {
      return NextResponse.json(
        { error: "Invalid collageImage format" },
        { status: 400 },
      );
    }
    const collageBase64 = collageMatch[2];

    // ── Build prompt (mirrors Puter prompt in page.js) ───────────────────────
    const prompt =
      `This image is a side-by-side collage. The LEFT half shows a person. The RIGHT half shows a dress/outfit. ` +
      `Your task: generate a single photorealistic image of the person from the LEFT wearing the exact dress from the RIGHT. ` +
      `CRITICAL RULES: ` +
      `(1) Reproduce the dress EXACTLY — every color, pattern, embroidery, print, texture, cut, neckline, sleeve length, and hem must be identical to the right-side reference. Do NOT alter any design detail. ` +
      `(2) Preserve the person's face COMPLETELY — same facial features, skin tone, expression, hair, and head position. Do NOT change anything above the shoulders. ` +
      `(3) Keep the person's body proportions, posture, and background unchanged. ` +
      `(4) Only replace the clothing — nothing else. ` +
      `Output: a single photorealistic full-body fashion photo of the person wearing the dress, sharp details, natural lighting.`;

    // ── 5. Call Gemini with collage ───────────────────────────────────────────
    const ai = new GoogleGenAI({ apiKey });

    console.log(`[Gemini TryOn] Sending collage request with model: ${GEMINI_MODEL}`);
    const startTime = Date.now();

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: prompt },
        { inlineData: { mimeType: "image/png", data: collageBase64 } },
      ],
      config: {
        responseModalities: ["IMAGE", "TEXT"],
        imageConfig: { aspectRatio: "2:3" },
      },
    });

    console.log(`[Gemini TryOn] Response in ${Date.now() - startTime}ms`);

    // ── 6. Extract image part ─────────────────────────────────────────────────
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p) => p.inlineData?.mimeType?.startsWith("image/"));

    if (!imagePart) {
      const textPart = parts.find((p) => p.text);
      console.error("[Gemini TryOn] No image returned. Text:", textPart?.text);
      return NextResponse.json(
        { error: "Gemini did not return an image. Try a different photo or dress." },
        { status: 422 },
      );
    }

    return NextResponse.json({
      output: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
    });
  } catch (err) {
    console.error("[Gemini TryOn Error]", err?.message);

    let msg = err?.message || "Internal server error";
    if (msg.includes("SAFETY"))
      msg = "Request blocked by safety filters. Try a different image.";
    else if (msg.includes("quota") || msg.includes("429"))
      msg = "Gemini API quota exceeded. Please try again later.";
    else if (msg.includes("404"))
      msg = "Model not found. Check your Gemini API access tier.";

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
