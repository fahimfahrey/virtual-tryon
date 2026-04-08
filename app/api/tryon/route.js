import { NextResponse } from "next/server";
import axios from "axios";

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

    // Fetch the dress image from the public folder and convert to base64
    const dressUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}${dressFile}`;
    let dressBase64 = "";
    try {
      const dressRes = await axios.get(dressUrl, {
        responseType: "arraybuffer",
      });
      dressBase64 = `data:image/png;base64,${Buffer.from(dressRes.data).toString("base64")}`;
    } catch {
      // fallback: use URL directly if fetch fails
      dressBase64 = dressUrl;
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
        timeout: 60000,
      },
    );

    console.log(
      `[TryOn API] Response in ${Date.now() - startTime}ms`,
      response.data?.status,
    );

    const data = response.data;

    // ModelsLab can return status: processing (queued) or success
    if (data.status === "success" && data.output?.[0]) {
      return NextResponse.json({ output: data.output[0] });
    }

    if (data.status === "processing") {
      // Poll the fetch URL
      const fetchUrl = data.fetch_result;
      if (!fetchUrl) {
        return NextResponse.json(
          { error: "Image is processing but no fetch URL provided" },
          { status: 202 },
        );
      }

      // Poll up to 10 times with 3s intervals
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const pollRes = await axios.post(
          fetchUrl,
          { key: apiKey },
          {
            headers: { "Content-Type": "application/json" },
            timeout: 15000,
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
