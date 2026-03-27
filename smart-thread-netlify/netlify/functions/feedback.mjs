// Receives feedback from the app and stores it / sends notification
export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { message, email, plan, timestamp } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "No message provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Option 1: Send via Netlify's built-in email (uses form submissions)
    // Option 2: Use a third-party email API (SendGrid, Resend, etc.)
    // Option 3: Store in Supabase table
    // For now: log it and use Netlify form detection as a webhook trigger

    // Store feedback - you can connect this to Supabase, a Slack webhook, or email API
    const feedbackEntry = {
      message,
      email: email || "anonymous",
      plan: plan || "seed",
      timestamp: timestamp || new Date().toISOString(),
      userAgent: req.headers.get("user-agent") || "",
    };

    // Log for Netlify function logs (visible in Netlify dashboard → Functions)
    console.log("FEEDBACK:", JSON.stringify(feedbackEntry));

    // Send email notification via fetch to an email API
    // Using Netlify's built-in email notification if configured,
    // or you can replace this with SendGrid/Resend/Mailgun
    const FEEDBACK_EMAIL = "gabrielharris10@icloud.com";
    
    // Try sending via a simple email webhook (Formspree as fallback)
    // Replace FORMSPREE_ID with your actual Formspree endpoint ID if you set one up
    const FORMSPREE_ID = Netlify.env.get("FORMSPREE_ID");
    if (FORMSPREE_ID) {
      await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _replyto: email,
          _subject: `Smart Thread Feedback [${plan}]`,
          message: `From: ${email}\nPlan: ${plan}\nTime: ${timestamp}\n\n${message}`,
        }),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Feedback error:", err);
    return new Response(JSON.stringify({ error: "Failed to submit feedback" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
