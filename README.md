# Sistema de Gestión de Turnos

SPA de reservas online para profesionales de la salud. Permite a pacientes elegir fecha y horario, completar sus datos y recibir confirmación por email. La profesional gestiona todo desde un panel de administración privado.

---

## Tabla de Contenidos

1. [Stack tecnológico](#stack)
2. [Estructura del proyecto](#estructura)
3. [Base de datos (Supabase)](#base-de-datos)
4. [Storage (Supabase)](#storage)
5. [Variables de entorno](#variables-de-entorno)
6. [Edge Function — Envío de emails](#edge-function)
7. [Flujo del paciente](#flujo-del-paciente)
8. [Flujo del administrador](#flujo-del-administrador)
9. [Deploy](#deploy)
10. [Nuevo cliente — qué cambiar](#nuevo-cliente)

---

## Stack

| Capa | Tecnología |
|---|---|
| UI | React 19 + TypeScript |
| Estilos | Tailwind CSS 4 |
| Routing | React Router DOM v7 |
| Animaciones | Motion (Framer Motion v12) |
| Backend / DB | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| Emails | Gmail SMTP via nodemailer (Edge Function) |
| Deploy | Vercel (frontend) + Supabase (backend) |

---

## Estructura

```
/
├── src/
│   ├── App.tsx                   # Routing principal y estado de sesión
│   ├── main.tsx                  # Entry point React
│   ├── types.ts                  # Tipos TypeScript (Appointment, etc.)
│   ├── index.css                 # Variables de tema (colores, fuentes)
│   ├── lib/
│   │   ├── supabase.ts           # Cliente Supabase singleton
│   │   └── utils.ts              # formatTime(), formatDate(), cn()
│   ├── services/
│   │   └── api.ts                # appointmentService + emailService
│   └── components/
│       ├── Layout.tsx            # Navbar + footer, envuelve toda la app
│       ├── Auth.tsx              # Login de la profesional
│       ├── Calendar.tsx          # Selector visual de fechas
│       ├── SlotSelector.tsx      # Grid de horarios disponibles
│       ├── BookingForm.tsx       # Formulario de datos del paciente
│       ├── CancelAppointment.tsx # Página de cancelación por link
│       ├── ProfileCard.tsx       # Tarjeta de presentación (paciente)
│       ├── AdminDashboard.tsx    # Panel de control
│       ├── CreateSlotsModal.tsx  # Modal para crear horarios (3 modos)
│       ├── GmailSetup.tsx        # Wizard para conectar Gmail
│       ├── ChangePassword.tsx    # Cambio de contraseña admin
│       └── PhotoUpload.tsx       # Subida de foto de perfil
├── supabase/
│   ├── functions/
│   │   └── send-confirmation/
│   │       └── index.ts          # Edge Function que envía emails
│   └── migrations/
│       ├── create_settings_table.sql
│       └── public_read_profile_photo.sql
├── .env                          # Variables locales (no subir a git)
├── vercel.json                   # Rewrites para SPA (evita 404 en refresh)
└── vite.config.ts                # Config de Vite
```

### Qué hace cada componente

**`Layout.tsx`** — Navbar con logo, nombre de la profesional, link al panel admin y botón de logout. Envuelve todas las páginas.

**`Calendar.tsx`** — Calendario mensual navegable. Desactiva fechas pasadas, resalta la seleccionada. Usa `date-fns` con locale español.

**`SlotSelector.tsx`** — Grid de horarios disponibles para la fecha elegida. Muestra skeleton mientras carga.

**`BookingForm.tsx`** — Formulario con nombre, email, teléfono (opcional) y notas (opcional).

**`ProfileCard.tsx`** — Tarjeta de presentación que aparece en la página del paciente. Muestra la foto de perfil (desde Supabase Storage), nombre y título de la profesional.

**`CancelAppointment.tsx`** — Página accesible por el link del email de confirmación (`/cancelar?id=xxx`). Valida que falten más de 48 horas antes de permitir cancelar. Al cancelar, resetea el slot a `available` y borra los datos del paciente.

**`AdminDashboard.tsx`** — Tabla de turnos filtrable por fecha. Marcar como completados, eliminar. Sidebar con accesos a: crear horarios, foto de perfil, Gmail y cambio de contraseña.

**`CreateSlotsModal.tsx`** — Modal con 3 modos para crear horarios:
- **Individual:** una fecha y una hora
- **Rango:** una fecha con horario desde/hasta y duración de sesión (30/45/60/90 min) — muestra preview de los slots generados
- **Período:** días de la semana + rango de fechas + horario + duración — genera slots en bloque para semanas completas

**`GmailSetup.tsx`** — Wizard de 5 pasos que guía a la profesional para obtener una Contraseña de Aplicación de Google y guardarla en la tabla `settings`.

**`ChangePassword.tsx`** — Formulario para cambiar la contraseña de acceso al panel. Valida la contraseña actual antes de actualizarla.

**`PhotoUpload.tsx`** — Sube una foto de perfil a Supabase Storage (bucket `profile`) y guarda la URL pública en la tabla `settings`. Acepta JPG, PNG, WebP hasta 5 MB.

---

## Base de datos

### Tabla `appointments`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK, generado automáticamente |
| `date` | DATE | Formato `YYYY-MM-DD` |
| `time` | TIME | Formato `HH:MM` |
| `status` | TEXT | `available` / `booked` / `completed` / `cancelled` |
| `name` | TEXT | Nombre del paciente (null si libre) |
| `email` | TEXT | Email del paciente (null si libre) |
| `phone` | TEXT | Teléfono (opcional) |
| `notes` | TEXT | Observaciones (opcional) |
| `created_at` | TIMESTAMPTZ | Auto |

**RLS recomendado:**
- Lectura de slots `available`: pública (anon)
- Escritura (reservar, cancelar): pública con validaciones
- Acceso total: solo usuario autenticado (la profesional)

### Tabla `settings`

| Campo | Tipo | Notas |
|---|---|---|
| `key` | TEXT | PK |
| `value` | TEXT | Valor de la configuración |
| `updated_at` | TIMESTAMPTZ | Auto |

**Claves usadas:**

| key | value |
|---|---|
| `gmail_user` | Email de Gmail de la profesional |
| `gmail_app_password` | Contraseña de aplicación de 16 caracteres |
| `profile_photo` | URL pública de la foto en Supabase Storage |

**RLS:**
- Usuarios autenticados: lectura y escritura total
- Anon (pacientes): solo lectura de `profile_photo`

SQL: `supabase/migrations/create_settings_table.sql` + `supabase/migrations/public_read_profile_photo.sql`

---

## Storage

**Bucket:** `profile` (público)

Almacena la foto de perfil de la profesional. Al subir una nueva foto, la URL pública se guarda en `settings` con key `profile_photo` y se muestra automáticamente en la página de reservas.

**Setup en Supabase:**
Supabase → Storage → New bucket → nombre: `profile` → activar **Public bucket** → Create

**Archivo guardado:** `photo.{ext}` (siempre se sobreescribe con `upsert: true`)

---

## Variables de entorno

### En el proyecto (`.env`)

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

Se obtienen en Supabase → Settings → API.

### En Vercel (Settings → Environment Variables)

Las mismas dos variables que en `.env`. Sin esto la app en producción no conecta a Supabase.

### En Supabase — Edge Function Secrets

Se configuran en Supabase → Edge Functions → Secrets:

| Secret | Descripción |
|---|---|
| `APP_URL` | URL de la app en Vercel. Se usa para armar el link de cancelación en los emails. |
| `THERAPIST_EMAIL` | (Opcional) Email donde recibir notificaciones. Si no se configura, usa el `gmail_user` de la tabla `settings`. |

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los provee Supabase automáticamente.

---

## Edge Function

**Ubicación:** `supabase/functions/send-confirmation/index.ts`

**Cuándo se invoca:** Cada vez que un paciente completa una reserva exitosa.

**Qué hace:**
1. Recibe `{ to, name, date, time, appointmentId }`
2. Lee `gmail_user` y `gmail_app_password` de la tabla `settings`
3. Arma dos emails HTML: uno para el paciente (con link de cancelación) y uno para la profesional (aviso de nueva reserva)
4. Los envía via Gmail SMTP usando `nodemailer`

**Para actualizar en Supabase:** Edge Functions → `send-confirmation` → Code → pegar contenido del archivo → Deploy.

**Importante:** Si la tabla `settings` no tiene credenciales de Gmail, la función devuelve error 500. La profesional debe completar el wizard "Configurar Email" desde el panel antes de que los emails funcionen.

---

## Flujo del paciente

```
/ (home)
├── Ve la tarjeta de presentación (foto, nombre, título)
├── Elige fecha en el calendario
├── Elige horario disponible
├── Completa nombre, email, teléfono, notas
└── Confirma reserva
    ├── Slot → "booked" en la DB
    ├── Email de confirmación al paciente (con link para cancelar)
    └── Email de aviso a la profesional

/cancelar?id=xxx (desde el link del email)
├── Carga datos del turno
├── Valida que falten más de 48 hs
├── (si aplica) Confirma cancelación
│   └── Slot vuelve a "available", datos del paciente se borran
└── Pantalla de resultado (éxito / demasiado tarde / no encontrado)
```

---

## Flujo del administrador

```
/login
└── Ingresa email y contraseña → redirige a /admin

/admin
├── Ver todos los turnos (filtro por fecha)
├── Marcar turno como completado / eliminar
├── "Nuevo Horario" → CreateSlotsModal
│   ├── Individual: fecha + hora
│   ├── Rango: fecha + desde/hasta + duración → preview de slots
│   └── Período: días de semana + rango de fechas + horario + duración
├── "Foto de Perfil" → PhotoUpload (sube a Supabase Storage)
├── "Configurar Email" → GmailSetup (wizard 5 pasos)
└── "Cambiar Contraseña" → ChangePassword
```

---

## Deploy

### Primera vez

**Vercel:**
1. Crear proyecto en vercel.com, conectar el repositorio
2. Agregar en Settings → Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deployar

**Supabase:**
1. Crear proyecto nuevo
2. Crear tabla `appointments` con el schema de arriba
3. Ejecutar SQL de `supabase/migrations/create_settings_table.sql`
4. Ejecutar SQL de `supabase/migrations/public_read_profile_photo.sql`
5. Crear bucket `profile` en Storage (público)
6. Crear usuario: Authentication → Users → Add user
7. Desactivar signup público: Authentication → Providers → Email → desactivar "Enable email signup"
8. Crear Edge Function: Edge Functions → New Function → nombre `send-confirmation` → pegar código → Deploy
9. Agregar secret `APP_URL` en Edge Functions → Secrets

### Actualizaciones futuras

- **Frontend:** push al repositorio → Vercel redeploya automáticamente
- **Edge Function:** Supabase → Edge Functions → editar código → Deploy

---

## Nuevo cliente — Qué cambiar

### Infraestructura (siempre)

- Nuevo proyecto en Supabase con sus propias tablas, bucket y usuario
- Nuevo proyecto en Vercel con las credenciales del nuevo Supabase

### Cambios en el código

| Qué | Archivo | Detalle |
|---|---|---|
| Título de la pestaña | `index.html` | `<title>` |
| Nombre en la navbar | `src/components/Layout.tsx` | Texto del logo |
| Nombre y título en tarjeta | `src/components/ProfileCard.tsx` | Nombre y especialidad |
| Colores del tema | `src/index.css` | `--color-primary` y `--color-primary-hover` |
| Horas límite para cancelar | `src/components/CancelAppointment.tsx` | Constante `CANCEL_HOURS_LIMIT` (default: 48) |
| Texto de los emails | `supabase/functions/send-confirmation/index.ts` | `patientHtml` y `therapistHtml` |
| Asunto de los emails | `supabase/functions/send-confirmation/index.ts` | Campos `subject:` |
| URL de fallback | `supabase/functions/send-confirmation/index.ts` | Valor por defecto de `APP_URL` |

### Lo que hace la profesional sola (sin tocar código)

- **Subir foto:** Panel admin → "Foto de Perfil"
- **Conectar Gmail:** Panel admin → "Configurar Email" → wizard
- **Cambiar contraseña:** Panel admin → "Cambiar Contraseña"
- **Crear horarios:** Panel admin → "Nuevo Horario" (individual, rango o período)

### Checklist de cambio de cliente

```
[ ] Nuevo proyecto Supabase creado
[ ] Tabla appointments creada
[ ] SQL create_settings_table.sql ejecutado
[ ] SQL public_read_profile_photo.sql ejecutado
[ ] Bucket "profile" creado en Storage (público)
[ ] Usuario de la profesional creado en Supabase Auth
[ ] Signup público desactivado en Supabase
[ ] Edge Function send-confirmation deployada
[ ] Secret APP_URL cargado en Supabase
[ ] Nuevo proyecto Vercel con credenciales del nuevo Supabase
[ ] index.html → título actualizado
[ ] Layout.tsx → nombre actualizado
[ ] ProfileCard.tsx → nombre y especialidad actualizados
[ ] index.css → colores ajustados (opcional)
[ ] send-confirmation/index.ts → textos de email personalizados
[ ] Profesional sube su foto desde el panel
[ ] Profesional configura su Gmail desde el panel
```
