// Verifies a Gumroad license key and returns the product tier
export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { license_key } = await req.json();

    if (!license_key) {
      return new Response(JSON.stringify({ success: false, error: "No license key provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Call Gumroad License Verification API
    const gumroadRes = await fetch("https://api.gumroad.com/v2/licenses/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        product_id: Netlify.env.get("GUMROAD_PRODUCT_ID") || "",
        license_key,
        increment_uses_count: "false", // Don't burn uses on verification
      }),
    });

    const data = await gumroadRes.json();

    if (!data.success) {
      return new Response(JSON.stringify({
        success: false,
        error: "Invalid or expired license key",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Determine tier from Gumroad product variant or purchase info
    // Customize this logic based on your Gumroad product setup:
    //   - Option A: Different products per tier (check product_id)
    //   - Option B: Variants within one product (check variant name)
    //   - Option C: Price-based (check price)
    const purchase = data.purchase || {};
    const variantName = (purchase.variants || "").toLowerCase();
    const price = purchase.price || 0;

    let tier = "grow"; // default paid tier
    if (variantName.includes("forever") || variantName.includes("lifetime")) {
      tier = "forever";
    } else if (variantName.includes("dominate")) {
      tier = "dominate";
    } else if (variantName.includes("scale")) {
      tier = "scale";
    } else if (variantName.includes("grow")) {
      tier = "grow";
    }
    // Price fallback if variant names aren't set
    if (tier === "grow" && !variantName) {
      if (price >= 19900) tier = "forever";
      else if (price >= 9900) tier = "dominate";
      else if (price >= 4900) tier = "scale";
    }

    return new Response(JSON.stringify({
      success: true,
      tier,
      email: purchase.email || null,
      license_key,
      uses: data.uses || 0,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message || "License verification failed",
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
