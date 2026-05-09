-- Columnas para trackear qué recordatorios ya se enviaron
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS reminder_24h_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_2h_sent  boolean NOT NULL DEFAULT false;

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Cron cada 30 minutos que llama a la Edge Function send-reminders
-- IMPORTANTE: reemplazá <SERVICE_ROLE_KEY> con tu clave de Supabase (Settings → API → service_role)
SELECT cron.schedule(
  'send-reminders',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://kowlmuuusleffpajmkeh.supabase.co/functions/v1/send-reminders',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtvd2xtdXV1c2xlZmZwYWpta2VoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzk1OTg3NiwiZXhwIjoyMDkzNTM1ODc2fQ.wzv7LseuFVSsOT9mR5UePDmoFnfvfz-ry3uA2SYAl9I", "Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  )
  $$
);
