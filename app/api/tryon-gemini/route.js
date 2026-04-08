import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

// Allow up to 60s on Vercel Pro; Hobby plan caps at 10s
export const maxDuration = 60;

// gemini-2.5-flash-image supports image output via generateContent
const GEMINI_MODEL = "gemini-2.5-flash-image";

export async function POST(request) {
  try {
    const {
      userImage,
      dressFile,
      dressName,
      prompt: extraPrompt,
    } = await request.json();

    if (!userImage || !dressFile) {
      return NextResponse.json(
        { error: "Missing userImage or dressFile" },
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

    // ── 1. Read dress image from disk — avoids self-referencing HTTP fetch that breaks on Vercel ──
    let dressBase64 = "";
    let dressMime = "image/png";

    try {
      const filePath = path.join(process.cwd(), "public", dressFile);
      const fileBuffer = fs.readFileSync(filePath);
      const ext = path.extname(dressFile).toLowerCase().replace(".", "");
      dressMime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
      dressBase64 = fileBuffer.toString("base64");
    } catch (err) {
      console.error("[Gemini] Failed to read dress image from disk:", err.message);
      return NextResponse.json(
        { error: "Could not load dress image" },
        { status: 500 },
      );
    }

    // ── 2. Strip data URL prefix from user image ──────────────────────────────
    const userMatch = userImage.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!userMatch) {
      return NextResponse.json(
        { error: "Invalid userImage format" },
        { status: 400 },
      );
    }
    const userMime = userMatch[1];
    const userBase64 = userMatch[2];

    // ── 3. Build prompt ───────────────────────────────────────────────────────
    const stylingNote = extraPrompt ? ` Additional styling: ${extraPrompt}.` : "";
    const geminiPrompt =
      `Virtual try-on task: dress the person from the first image in the exact outfit shown in the second image. ` +
      `CRITICAL RULES — follow every one strictly: ` +
      `(1) Reproduce the outfit EXACTLY as shown in the second image: every color, pattern, embroidery, print, texture, fabric, cut, neckline, collar, sleeve length, hem, and decorative detail must be pixel-perfect identical — do NOT alter, simplify, recolor, or reinterpret any design element whatsoever. ` +
      `(2) Preserve the person's face COMPLETELY: same facial features, skin tone, complexion, expression, hair style, hair color, and head position — do NOT change anything above the shoulders. ` +
      `(3) Keep the person's body shape, posture, height proportions, and original background unchanged. ` +
      `(4) Only replace the clothing — nothing else in the image should change. ` +
      `Output: photorealistic full-body portrait, sharp details, natural lighting, suitable for e-commerce.` +
      stylingNote;

    // ── 4. Call Gemini ────────────────────────────────────────────────────────
    const ai = new GoogleGenAI({ apiKey });

    console.log(`[Gemini TryOn] Sending request with model: ${GEMINI_MODEL}`);
    const startTime = Date.now();

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: geminiPrompt },
        { inlineData: { mimeType: userMime, data: userBase64 } },
        { inlineData: { mimeType: dressMime, data: dressBase64 } },
      ],
      config: {
        responseModalities: ["IMAGE", "TEXT"],
        imageConfig: {
          aspectRatio: "2:3",
        },
      },
    });

    console.log(`[Gemini TryOn] Response in ${Date.now() - startTime}ms`);

    // ── 5. Extract image part ─────────────────────────────────────────────────
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p) =>
      p.inlineData?.mimeType?.startsWith("image/"),
    );

    if (!imagePart) {
      const textPart = parts.find((p) => p.text);
      console.error("[Gemini TryOn] No image returned. Text:", textPart?.text);
      return NextResponse.json(
        {
          error:
            "Gemini did not return an image. Try a different photo or dress.",
        },
        { status: 422 },
      );
    }

    const outputMime = imagePart.inlineData.mimeType;
    const outputBase64 = imagePart.inlineData.data;
    return NextResponse.json({
      output: `data:${outputMime};base64,${outputBase64}`,
    });
  } catch (err) {
    console.error("[Gemini TryOn Error]", err?.message);

    let msg = err?.message || "Internal server error";
    if (msg.includes("SAFETY"))
      msg = "Request blocked by safety filters. Try a different image.";
    else if (msg.includes("quota") || msg.includes("429"))
      msg = "Gemini API quota exceeded. Please try again later.";
    else if (msg.includes("404"))
      msg = `Model not found. Check your Gemini API access tier.`;

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
