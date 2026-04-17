import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const supabaseAuth = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!
);

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "ArtistStage <noreply@artiststage.it>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
  return res.json();
}

function baseLayout(content: string) {
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ArtistStage</title>
  <style>
    body { margin: 0; background: #09090B; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #d4d4d8; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #18181B; border: 1px solid #27272A; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #FF007A22, #00F0FF11); padding: 32px 40px 24px; border-bottom: 1px solid #27272A; }
    .logo { font-size: 22px; font-weight: 800; color: #fff; letter-spacing: -0.5px; }
    .logo span { color: #FF007A; }
    .body { padding: 32px 40px; }
    h1 { font-size: 22px; font-weight: 700; color: #fff; margin: 0 0 8px; }
    p { margin: 0 0 16px; line-height: 1.6; color: #a1a1aa; font-size: 15px; }
    .card { background: #09090B; border: 1px solid #27272A; border-radius: 10px; padding: 16px 20px; margin: 20px 0; }
    .card-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
    .card-label { color: #71717A; }
    .card-value { color: #e4e4e7; font-weight: 500; }
    .btn { display: inline-block; background: #FF007A; color: #fff !important; text-decoration: none; font-weight: 700; font-size: 15px; padding: 12px 28px; border-radius: 10px; margin-top: 8px; }
    .badge-ok { background: #00C89622; color: #00C896; border: 1px solid #00C89640; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; display: inline-block; }
    .badge-no { background: #EF444422; color: #EF4444; border: 1px solid #EF444440; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; display: inline-block; }
    .footer { padding: 20px 40px; border-top: 1px solid #27272A; text-align: center; font-size: 12px; color: #52525B; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">Artist<span>Stage</span></div>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      ArtistStage · La piattaforma per artisti emergenti<br/>
      <a href="https://artiststage.it/privacy" style="color:#52525B;">Privacy</a> &nbsp;·&nbsp;
      <a href="https://artiststage.it/terms" style="color:#52525B;">Termini</a>
    </div>
  </div>
</body>
</html>`;
}

function templateWelcome(name: string) {
  return baseLayout(`
    <h1>Benvenuto su ArtistStage! 🎤</h1>
    <p>Ciao <strong style="color:#fff">${escapeHtml(name)}</strong>,</p>
    <p>Il tuo account è stato creato con successo. Sei pronto a far conoscere il tuo talento al mondo.</p>
    <p>Cosa puoi fare adesso:</p>
    <div class="card">
      <div class="card-row"><span class="card-label">🎭 Crea il profilo artista</span><span class="card-value">Dashboard → Profilo</span></div>
      <div class="card-row"><span class="card-label">📅 Imposta disponibilità</span><span class="card-value">Dashboard → Calendario</span></div>
      <div class="card-row"><span class="card-label">🔴 Vai in Live</span><span class="card-value">Dashboard → Vai in Live</span></div>
    </div>
    <a href="https://artiststage.it/dashboard" class="btn">Vai alla Dashboard</a>
  `);
}

function templateBookingRequest(artistName: string, venueName: string, date: string, timeSlot: string, message: string) {
  return baseLayout(`
    <h1>Nuova richiesta di prenotazione! 📅</h1>
    <p>Ciao <strong style="color:#fff">${escapeHtml(artistName)}</strong>, hai ricevuto una nuova richiesta di prenotazione.</p>
    <div class="card">
      <div class="card-row"><span class="card-label">Venue / Cliente</span><span class="card-value">${escapeHtml(venueName)}</span></div>
      <div class="card-row"><span class="card-label">Data</span><span class="card-value">${escapeHtml(date)}</span></div>
      <div class="card-row"><span class="card-label">Fascia oraria</span><span class="card-value">${escapeHtml(timeSlot)}</span></div>
      ${message ? `<div class="card-row" style="flex-direction:column;gap:4px"><span class="card-label">Messaggio</span><span class="card-value" style="margin-top:4px">${escapeHtml(message)}</span></div>` : ''}
    </div>
    <p>Accedi alla dashboard per confermare o rifiutare la richiesta.</p>
    <a href="https://artiststage.it/dashboard#calendar" class="btn">Gestisci la richiesta</a>
  `);
}

function templateBookingResponse(venueName: string, artistName: string, date: string, timeSlot: string, confirmed: boolean) {
  const badge = confirmed
    ? `<span class="badge-ok">✓ Confermata</span>`
    : `<span class="badge-no">✗ Rifiutata</span>`;
  const body = confirmed
    ? `<p>Ottima notizia! L'artista ha confermato la tua richiesta. Puoi contattarlo direttamente tramite la piattaforma per i dettagli organizzativi.</p>`
    : `<p>Purtroppo l'artista non è disponibile per quella data. Puoi cercare altri artisti sulla piattaforma.</p>`;
  return baseLayout(`
    <h1>Aggiornamento prenotazione</h1>
    <p>Ciao <strong style="color:#fff">${escapeHtml(venueName)}</strong>, ecco l'aggiornamento sulla tua richiesta a <strong style="color:#fff">${escapeHtml(artistName)}</strong>.</p>
    <div class="card">
      <div class="card-row"><span class="card-label">Artista</span><span class="card-value">${escapeHtml(artistName)}</span></div>
      <div class="card-row"><span class="card-label">Data</span><span class="card-value">${escapeHtml(date)}</span></div>
      <div class="card-row"><span class="card-label">Fascia oraria</span><span class="card-value">${escapeHtml(timeSlot)}</span></div>
      <div class="card-row"><span class="card-label">Stato</span><span class="card-value">${badge}</span></div>
    </div>
    ${body}
    <a href="https://artiststage.it/messages" class="btn">Apri i messaggi</a>
  `);
}

function templateCashoutUpdate(artistName: string, amountEur: string, status: string) {
  const approved = status === 'completed';
  const badge = approved
    ? `<span class="badge-ok">✓ Approvato</span>`
    : `<span class="badge-no">✗ Rifiutato</span>`;
  const body = approved
    ? `<p>Il tuo cashout è stato approvato. Il bonifico verrà elaborato nei prossimi 2–3 giorni lavorativi.</p>`
    : `<p>Il tuo cashout è stato rifiutato. Per chiarimenti contatta il supporto a <a href="mailto:support@artiststage.it" style="color:#FF007A;">support@artiststage.it</a>.</p>`;
  return baseLayout(`
    <h1>Aggiornamento cashout</h1>
    <p>Ciao <strong style="color:#fff">${escapeHtml(artistName)}</strong>,</p>
    <div class="card">
      <div class="card-row"><span class="card-label">Importo netto richiesto</span><span class="card-value">€${escapeHtml(amountEur)}</span></div>
      <div class="card-row"><span class="card-label">Stato</span><span class="card-value">${badge}</span></div>
    </div>
    ${body}
  `);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Verifica JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
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
    const { type, payload } = await req.json();

    if (type === "welcome") {
      const { email, name } = payload;
      await sendEmail(email, "Benvenuto su ArtistStage! 🎤", templateWelcome(name || "artista"));
    }

    else if (type === "booking_request") {
      // Look up artist's contact email
      const { data: artist } = await supabase
        .from("artist_profiles")
        .select("stage_name, contact_email")
        .eq("id", payload.artist_id)
        .maybeSingle();

      if (artist?.contact_email) {
        await sendEmail(
          artist.contact_email,
          `📅 Nuova richiesta di prenotazione da ${payload.visitor_name}`,
          templateBookingRequest(artist.stage_name, payload.visitor_name, payload.date, payload.time_slot, payload.message || "")
        );
      }
    }

    else if (type === "booking_response") {
      // Look up visitor's contact email
      const { data: visitor } = await supabase
        .from("visitor_profiles")
        .select("name, contact_email")
        .eq("user_id", payload.visitor_id)
        .maybeSingle();

      if (visitor?.contact_email) {
        await sendEmail(
          visitor.contact_email,
          payload.confirmed ? `✅ Prenotazione confermata da ${payload.artist_name}` : `❌ Prenotazione rifiutata da ${payload.artist_name}`,
          templateBookingResponse(visitor.name || "Cliente", payload.artist_name, payload.date, payload.time_slot, payload.confirmed)
        );
      }
    }

    else if (type === "cashout_update") {
      // Look up artist by profile id (artist_profiles.id)
      let query = supabase.from("artist_profiles").select("stage_name, contact_email");
      if (payload.artist_profile_id) {
        query = query.eq("id", payload.artist_profile_id);
      } else {
        query = query.eq("user_id", payload.artist_user_id);
      }
      const { data: artist } = await query.maybeSingle();

      if (artist?.contact_email) {
        await sendEmail(
          artist.contact_email,
          payload.status === "completed" ? "✅ Cashout approvato" : "❌ Cashout rifiutato",
          templateCashoutUpdate(artist.stage_name, payload.amount_eur, payload.status)
        );
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("send-email error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
