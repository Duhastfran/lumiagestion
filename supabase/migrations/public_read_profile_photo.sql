-- Permite que pacientes (no logueados) puedan leer la foto de perfil
create policy "public_read_profile_photo" on settings
  for select
  to anon
  using (key = 'profile_photo');
