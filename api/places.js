export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  const q = String(req.query.q || "").trim();

  if (!key) {
    return res.status(500).json({
      ok: false,
      error: "Thiếu GOOGLE_MAPS_SERVER_KEY trên Vercel."
    });
  }

  if (q.length < 3) {
    return res.status(200).json({ ok: true, suggestions: [] });
  }

  try {
    const response = await fetch(
      "https://places.googleapis.com/v1/places:autocomplete",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key
        },
        body: JSON.stringify({
          input: q,
          includedRegionCodes: ["vn"],
          languageCode: "vi",
          regionCode: "vn"
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const message =
        data?.error?.message ||
        "Places API không trả được gợi ý địa chỉ.";

      return res.status(response.status).json({
        ok: false,
        error: message
      });
    }

    const suggestions = (data.suggestions || [])
      .map((item) => item.placePrediction)
      .filter(Boolean)
      .map((place) => ({
        placeId: place.placeId || "",
        text:
          place.text?.text ||
          place.structuredFormat?.mainText?.text ||
          ""
      }))
      .filter((item) => item.text);

    return res.status(200).json({
      ok: true,
      suggestions
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error?.message || "Lỗi kết nối Places API."
    });
  }
}
