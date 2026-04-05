import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";

// gemini-2.5-flash-image supports image output via generateContent
// Docs: https://ai.google.dev/gemini-api/docs/image-generation
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

    // ── 1. Fetch dress image → base64 ─────────────────────────────────────────
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const dressUrl = `${baseUrl}${dressFile}`;
    let dressBase64 = "";
    let dressMime = "image/png";

    try {
      const dressRes = await axios.get(dressUrl, {
        responseType: "arraybuffer",
        timeout: 10000,
      });
      dressMime =
        dressRes.headers["content-type"]?.split(";")[0] || "image/png";
      dressBase64 = Buffer.from(dressRes.data).toString("base64");
    } catch (err) {
      console.error("[Gemini] Failed to fetch dress image:", err.message);
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
    const stylingNote = extraPrompt
      ? ` Additional styling: ${extraPrompt}.`
      : "";
    const geminiPrompt =
      `Create a professional e-commerce fashion photo. ` +
      `The first image is a person (full body). The second image is a "${dressName}" dress product photo. ` +
      `Let the person from the first image wear the dress from the second image. ` +
      `Generate a realistic, full-body shot preserving the person's exact face, body shape, posture, skin tone, and original background. ` +
      `Adjust lighting and shadows naturally. Do not alter the person's face or body beyond the dress overlay. ` +
      `Output: high-resolution photorealistic portrait, suitable for e-commerce.` +
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
          aspectRatio: "2:3", // portrait — good for fashion
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
