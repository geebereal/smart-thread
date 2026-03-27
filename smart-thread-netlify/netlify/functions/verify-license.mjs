// Verifies a license key exists in the database and is valid
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { license_key, user_email } = await req.json();

    if (!license_key) {
      return new Response(JSON.stringify({ valid: false, error: "No license key provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Netlify.env.get("VITE_SUPABASE_URL");
    const supabaseServiceKey = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ valid: false, error: "Server misconfigured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: keyRow, error } = await supabase
      .from("license_keys")
      .select("*")
      .eq("key_code", license_key.trim().toUpperCase())
      .single();

    if (error || !keyRow) {
      return new Response(JSON.stringify({
        valid: false,
        error: "This license key was not found. Please check and try again.",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (keyRow.status === "revoked") {
      return new Response(JSON.stringify({
        valid: false,
        error: "This license key has been revoked.",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (keyRow.status === "claimed" && keyRow.claimed_by && user_email && keyRow.claimed_by !== user_email) {
      return new Response(JSON.stringify({
        valid: false,
        error: "This license key has already been claimed by another account.",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Mark as claimed if not already
    if (keyRow.status === "issued") {
      await supabase
        .from("license_keys")
        .update({
          status: "claimed",
          claimed_by: user_email || "unknown",
          claimed_at: new Date().toISOString(),
        })
        .eq("id", keyRow.id);
    }

    return new Response(JSON.stringify({
      valid: true,
      tier: keyRow.tier,
      duration_days: keyRow.duration_days,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({
      valid: false,
      error: err.message || "License verification failed",
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
