import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Supabase auth client per verificare i JWT ES256 (nuove chiavi asimmetriche)
const supabaseAuth = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!
);

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Verifica JWT internamente (supporta sia HS256 che ES256)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { type, price_id, package_id, user_id, coins, package_name } = await req.json();

    const origin = req.headers.get("origin") || "http://localhost:3000";

    if (type === "coins") {
      // Checkout per acquisto monete
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price: price_id,
          quantity: 1,
        }],
        mode: "payment",
        success_url: `${origin}/coins?success=true`,
        cancel_url: `${origin}/coins?canceled=true`,
        metadata: {
          type: "coin_purchase",
          user_id,
          coins: coins.toString(),
          package_name,
        },
      });

      // Salva l'acquisto in pending
      const { error: insertError } = await supabase.from("coin_purchases").insert({
        user_id,
        package_id,
        coins_received: coins,
        amount_cents: session.amount_total,
        stripe_payment_id: session.payment_intent as string,
        status: "pending",
      });

      if (insertError) {
        console.error("coin_purchases insert error:", insertError.message);
      }

      return new Response(
        JSON.stringify({ url: session.url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (type === "subscription") {
      // Checkout per abbonamento Pro
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price: price_id,
          quantity: 1,
        }],
        mode: "subscription",
        success_url: `${origin}/dashboard?pro=success`,
        cancel_url: `${origin}/pricing?canceled=true`,
        metadata: {
          type: "subscription",
          user_id,
        },
      });

      return new Response(
        JSON.stringify({ url: session.url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Tipo non valido" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});