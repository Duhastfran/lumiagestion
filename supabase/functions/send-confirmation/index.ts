import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, name, date, time, appointmentId } = await req.json();

    if (!to || !name || !date || !time || !appointmentId) {
      return new Response(JSON.stringify({ error: 'Faltan campos requeridos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
    const THERAPIST_EMAIL = Deno.env.get('THERAPIST_EMAIL')!;
    const APP_URL = Deno.env.get('APP_URL')!;
    const FROM_EMAIL = 'onboarding@resend.dev';

    const cancelUrl = `${APP_URL}/cancelar?id=${appointmentId}`;

    const patientHtml = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">¡Turno confirmado!</h2>
        <p>Hola <strong>${name}</strong>, tu turno fue reservado exitosamente.</p>
        <div style="background: #f9f9f9; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <p style="margin: 0;"><strong>Fecha:</strong> ${date}</p>
          <p style="margin: 8px 0 0;"><strong>Hora:</strong> ${time}</p>
        </div>
        <p style="color: #666; font-size: 14px;">
          Si necesitás cancelar tu turno, podés hacerlo hasta 48 horas antes desde el siguiente link:
        </p>
        <a href="${cancelUrl}" style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Cancelar turno
        </a>
        <p style="color: #999; font-size: 12px; margin-top: 32px;">
          Si no realizaste esta reserva, ignorá este email.
        </p>
      </div>
    `;

    const therapistHtml = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Nueva reserva recibida</h2>
        <p>Un paciente acaba de reservar un turno.</p>
        <div style="background: #f9f9f9; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <p style="margin: 0;"><strong>Paciente:</strong> ${name}</p>
          <p style="margin: 8px 0 0;"><strong>Email:</strong> ${to}</p>
          <p style="margin: 8px 0 0;"><strong>Fecha:</strong> ${date}</p>
          <p style="margin: 8px 0 0;"><strong>Hora:</strong> ${time}</p>
        </div>
      </div>
    `;

    const sendEmail = (toEmail: string, subject: string, html: string) =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: FROM_EMAIL, to: toEmail, subject, html }),
      });

    await Promise.all([
      sendEmail(to, `Confirmación de turno — ${date} ${time}`, patientHtml),
      sendEmail(THERAPIST_EMAIL, `Nueva reserva: ${name} — ${date} ${time}`, therapistHtml),
    ]);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
