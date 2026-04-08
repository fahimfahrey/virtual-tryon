import { NextResponse } from "next/server";
import axios from "axios";

// Allow up to 60s on Vercel Pro; Hobby plan caps at 10s
export const maxDuration = 60;

export async function POST(request) {
  try {
    const { collageImage } = await request.json();

    if (!collageImage) {
      return NextResponse.json(
        { error: "Missing collageImage" },
        { status: 400 },
      );
    }

    const apiKey = process.env.MODELSLAB_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 },
      );
    }

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

    const payload = {
      key: apiKey,
      prompt,
      negative_prompt:
        "blurry, distorted, low quality, artifacts, deformed, split image, collage, two people, side by side",
      init_image: collageImage,
      model_id: "sdxl",
      width: 512,
      height: 768,
      samples: 1,
      num_inference_steps: 20,
      guidance_scale: 7.5,
      strength: 0.7,
      seed: null,
      webhook: null,
      track_id: null,
    };

    console.log("[TryOn API] Sending collage request to ModelsLab...");
    const startTime = Date.now();

    const response = await axios.post(
      "https://modelslab.com/api/v6/images/img2img",
      payload,
      {
        headers: { "Content-Type": "application/json" },
        timeout: 55000,
      },
    );

    console.log(
      `[TryOn API] Response in ${Date.now() - startTime}ms`,
      response.data?.status,
    );

    const data = response.data;

    if (data.status === "success" && data.output?.[0]) {
      return NextResponse.json({ output: data.output[0] });
    }

    if (data.status === "processing") {
      const fetchUrl = data.fetch_result;
      if (!fetchUrl) {
        return NextResponse.json(
          { error: "Image is processing but no fetch URL provided" },
          { status: 202 },
        );
      }

      // Poll up to 5 times with 5s intervals (~25s total, safe within 60s limit)
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        const pollRes = await axios.post(
          fetchUrl,
          { key: apiKey },
          { headers: { "Content-Type": "application/json" }, timeout: 10000 },
        );
        if (pollRes.data?.status === "success" && pollRes.data?.output?.[0]) {
          console.log(`[TryOn API] Polled success on attempt ${i + 1}`);
          return NextResponse.json({ output: pollRes.data.output[0] });
        }
      }

      return NextResponse.json(
        { error: "Image generation timed out. Please try again." },
        { status: 504 },
      );
    }

    if (data.message) {
      return NextResponse.json({ error: data.message }, { status: 422 });
    }

    return NextResponse.json(
      { error: "Unexpected API response" },
      { status: 500 },
    );
  } catch (err) {
    console.error("[TryOn API Error]", err?.response?.data || err.message);
    const msg =
      err?.response?.data?.message || err.message || "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
