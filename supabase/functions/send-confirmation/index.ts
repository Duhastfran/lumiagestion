import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    // Read Gmail credentials from settings table
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: settingsRows, error: settingsError } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['gmail_user', 'gmail_app_password']);

    if (settingsError || !settingsRows || settingsRows.length < 2) {
      return new Response(JSON.stringify({ error: 'Email no configurado. Configurá Gmail desde el panel de admin.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const settings = Object.fromEntries(settingsRows.map(r => [r.key, r.value]));
    const GMAIL_USER = settings['gmail_user'];
    const GMAIL_PASS = settings['gmail_app_password'];
    const THERAPIST_EMAIL = Deno.env.get('THERAPIST_EMAIL') ?? GMAIL_USER;
    const APP_URL = Deno.env.get('APP_URL') ?? 'https://lumina-turnero.vercel.app';

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

    // Send via Gmail SMTP using nodemailer (npm compat in Deno)
    const nodemailer = await import('npm:nodemailer');
    const transporter = nodemailer.default.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });

    await Promise.all([
      transporter.sendMail({
        from: `"Lumina Turnero" <${GMAIL_USER}>`,
        to,
        subject: `Confirmación de turno — ${date} ${time}`,
        html: patientHtml,
      }),
      transporter.sendMail({
        from: `"Lumina Turnero" <${GMAIL_USER}>`,
        to: THERAPIST_EMAIL,
        subject: `Nueva reserva: ${name} — ${date} ${time}`,
        html: therapistHtml,
      }),
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
