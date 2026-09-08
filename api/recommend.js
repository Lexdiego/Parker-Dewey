module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { hvacType, buildingAge, buildingSize, energyBill, score } =
      req.body || {};

    if (
      !hvacType ||
      !buildingAge ||
      !buildingSize ||
      !energyBill ||
      score === undefined
    ) {
      return res
        .status(400)
        .json({ error: "Missing required building analysis data" });
    }

    const prompt = `You are an energy efficiency consultant working with Trane Technologies. Based on the following building profile, provide exactly 6 specific actionable recommendations for improving energy efficiency. Each recommendation must be on its own line and must begin with a relevant emoji. Make each recommendation highly specific to this building and avoid generic advice.

Building Profile:
- Age: ${buildingAge} years
- Size: ${buildingSize} square feet
- HVAC System: ${hvacType}
- Monthly Energy Bill: $${energyBill}
- Energy Efficiency Score: ${score}/100

Return only the 6 recommendations, one per line.`;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res
        .status(500)
        .json({ error: "Missing OPENROUTER_API_KEY environment variable" });
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://parker-dewey.vercel.app",
          "X-Title": "Energy Efficiency Checker",
        },
        body: JSON.stringify({
          model: "openrouter/auto",
          messages: [
            {
              role: "system",
              content:
                "You are a precise energy efficiency consultant. Tailor every recommendation to the provided building profile and keep them practical, measurable, and specific.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 800,
          temperature: 0.4,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter error:", response.status, errorText);
      return res
        .status(500)
        .json({ error: "OpenRouter API failed", details: errorText });
    }

    const data = await response.json();
    const rawContent = data?.choices?.[0]?.message?.content;
    const content = Array.isArray(rawContent)
      ? rawContent
          .map((part) => (typeof part === "string" ? part : part?.text || ""))
          .join("\n")
      : typeof rawContent === "string"
        ? rawContent
        : "";

    if (!content.trim()) {
      console.error("Invalid AI response structure:", JSON.stringify(data));
      return res.status(500).json({
        error: "Invalid AI response",
        details: JSON.stringify(data),
      });
    }

    const recommendations = content
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .slice(0, 6);

    if (recommendations.length === 0) {
      return res
        .status(500)
        .json({ error: "No recommendations returned from AI model" });
    }

    return res.status(200).json({ recommendations });
  } catch (error) {
    console.error("Handler error:", error);
    return res.status(500).json({ error: error.message });
  }
};
