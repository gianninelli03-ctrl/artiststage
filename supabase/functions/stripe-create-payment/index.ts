import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { type, amount_cents, stripe_account_id, metadata } = await req.json();

    if (!type || !amount_cents || !stripe_account_id) {
      return new Response(
        JSON.stringify({ error: "Parametri mancanti" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calcola commissione: 15% su booking
    const commission_pct = type === "booking" ? 0.15 : 0.15;
    const fee_cents = Math.round(amount_cents * commission_pct);

    // Crea PaymentIntent con commissione automatica
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount_cents,
      currency: "eur",
      application_fee_amount: fee_cents,
      transfer_data: {
        destination: stripe_account_id,
      },
      metadata: {
        type,
        ...metadata,
      },
    });

    return new Response(
      JSON.stringify({
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        fee_cents,
        net_cents: amount_cents - fee_cents,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});