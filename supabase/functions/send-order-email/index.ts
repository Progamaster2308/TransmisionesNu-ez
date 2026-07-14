const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

type EmailPayload = {
  subject?: string;
  body?: string;
  fields?: Record<string, unknown>;
};

function buildText(email: EmailPayload) {
  if (email.body) return email.body;

  return Object.entries(email.fields ?? {})
    .map(([label, value]) => `${label}: ${String(value ?? '')}`)
    .join('\n\n');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'transmisionesnunezz@gmail.com';
    const fromEmail = Deno.env.get('FROM_EMAIL');
    const replyToEmail = Deno.env.get('REPLY_TO_EMAIL') || adminEmail;

    if (!resendApiKey || !fromEmail) {
      return Response.json(
        { error: 'Missing RESEND_API_KEY or FROM_EMAIL' },
        { status: 500, headers: corsHeaders }
      );
    }

    const payload = await request.json();
    const email = payload.email as EmailPayload | undefined;

    if (!email?.subject) {
      return Response.json(
        { error: 'Invalid email payload' },
        { status: 400, headers: corsHeaders }
      );
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [adminEmail],
        reply_to: replyToEmail,
        subject: email.subject,
        text: buildText(email)
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      return Response.json(
        { error: 'Email provider rejected the request', detail },
        { status: 502, headers: corsHeaders }
      );
    }

    const data = await response.json();
    return Response.json({ ok: true, data }, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500, headers: corsHeaders }
    );
  }
});
