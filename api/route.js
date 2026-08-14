function parseDurationSeconds(value) {
  const match = String(value || "").match(/^([\d.]+)s$/);
  return match ? Number(match[1]) : 0;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const key = process.env.GOOGLE_MAPS_SERVER_KEY;

  if (!key) {
    return res.status(500).json({
      ok: false,
      error: "Thiếu GOOGLE_MAPS_SERVER_KEY trên Vercel."
    });
  }

  const pickup = String(req.query.pickup || "").trim();
  const destination = String(req.query.destination || "").trim();
  const pickupPlaceId = String(req.query.pickupPlaceId || "").trim();
  const destinationPlaceId = String(req.query.destinationPlaceId || "").trim();

  if (!pickup || !destination) {
    return res.status(400).json({
      ok: false,
      error: "Thiếu điểm đón hoặc điểm đến."
    });
  }

  const origin = pickupPlaceId
    ? { placeId: pickupPlaceId }
    : { address: pickup };

  const dest = destinationPlaceId
    ? { placeId: destinationPlaceId }
    : { address: destination };

  try {
    const response = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "routes.distanceMeters,routes.duration"
        },
        body: JSON.stringify({
          origin,
          destination: dest,
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_UNAWARE",
          languageCode: "vi-VN",
          regionCode: "vn"
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const message =
        data?.error?.message ||
        "Routes API không tính được quãng đường.";

      return res.status(response.status).json({
        ok: false,
        error: message
      });
    }

    const route = data?.routes?.[0];

    if (!route?.distanceMeters) {
      return res.status(422).json({
        ok: false,
        error: "Không tìm thấy tuyến đường phù hợp."
      });
    }

    const meters = Number(route.distanceMeters);
    const seconds = parseDurationSeconds(route.duration);

    return res.status(200).json({
      ok: true,
      meters,
      km: Math.round((meters / 1000) * 10) / 10,
      minutes: seconds ? Math.max(1, Math.round(seconds / 60)) : 0
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error?.message || "Lỗi kết nối Routes API."
    });
  }
}
