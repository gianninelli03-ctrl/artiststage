import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature")!;
  const body = await req.text();
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    return new Response(`Webhook error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {

      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const type = pi.metadata?.type;

        if (type === "booking") {
          await supabase
            .from("venue_booking_payments")
            .update({ status: "paid" })
            .eq("stripe_payment_id", pi.id);

          await supabase
            .from("venue_booking_requests")
            .update({ status: "paid" })
            .eq("id", pi.metadata?.booking_id);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from("artist_subscriptions")
          .update({
            status: sub.status,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          })
          .eq("stripe_sub_id", sub.id as string);
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await supabase
          .from("stripe_connect_accounts")
          .update({
            onboarding_complete: account.details_submitted,
            payouts_enabled: account.payouts_enabled,
            charges_enabled: account.charges_enabled,
          })
          .eq("stripe_account_id", account.id);
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.metadata?.type === "coin_purchase") {
          const userId = session.metadata?.user_id;
          const coins = parseInt(session.metadata?.coins || "0");

          await supabase.rpc("add_coins_to_balance", {
            p_user_id: userId,
            p_coins: coins,
          });

          await supabase
            .from("coin_purchases")
            .update({ status: "completed" })
            .eq("stripe_payment_id", session.payment_intent as string);
        }

        if (session.metadata?.type === "subscription" && session.subscription) {
          const userId = session.metadata?.user_id;
          const stripeSubId = session.subscription as string;
          const stripeCustomerId = session.customer as string;

          // Retrieve the subscription to get period end and interval
          const sub = await stripe.subscriptions.retrieve(stripeSubId);
          const interval = sub.items.data[0]?.price?.recurring?.interval;
          const billingPeriod = interval === "year" ? "yearly" : "monthly";

          // Look up the pro plan_id
          const { data: planData } = await supabase
            .from("subscription_plans")
            .select("id")
            .eq("name", "pro")
            .single();

          await supabase
            .from("artist_subscriptions")
            .upsert({
              artist_id: userId,
              plan_id: planData?.id,
              stripe_sub_id: stripeSubId,
              stripe_customer_id: stripeCustomerId,
              billing_period: billingPeriod,
              status: sub.status,
              current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            }, { onConflict: "stripe_sub_id" });
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});