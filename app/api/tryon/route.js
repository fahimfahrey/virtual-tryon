import { NextResponse } from "next/server";
import axios from "axios";
import fs from "fs";
import path from "path";

// Allow up to 60s on Vercel Pro; Hobby plan caps at 10s
export const maxDuration = 60;

export async function POST(request) {
  try {
    const { userImage, dressFile, dressName } = await request.json();

    if (!userImage || !dressFile) {
      return NextResponse.json(
        { error: "Missing userImage or dressFile" },
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

    // Read dress image from disk — avoids self-referencing HTTP fetch that breaks on Vercel
    let dressBase64 = "";
    try {
      const filePath = path.join(process.cwd(), "public", dressFile);
      const fileBuffer = fs.readFileSync(filePath);
      const ext = path.extname(dressFile).toLowerCase().replace(".", "");
      const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
      dressBase64 = `data:${mime};base64,${fileBuffer.toString("base64")}`;
    } catch {
      // fallback: use public URL if disk read fails
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
      dressBase64 = baseUrl ? `${baseUrl}${dressFile}` : dressFile;
    }

    const payload = {
      key: apiKey,
      prompt: `Virtual try-on: a person wearing the exact "${dressName}" outfit with every design detail, color, pattern, and texture reproduced precisely as in the reference. Preserve the person's exact face, skin tone, body shape, and background. Only replace the clothing, change nothing else. Full body, photorealistic, high quality, fashion photography.`,
      negative_prompt: "blurry, distorted, low quality, artifacts, deformed",
      init_image: userImage,
      control_image: dressBase64,
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

    console.log("[TryOn API] Sending request to ModelsLab...");
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
          {
            headers: { "Content-Type": "application/json" },
            timeout: 10000,
          },
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
