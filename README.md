# Nexa Core

Gestión interna de clientes, cobros y gastos para NEXA CONSULTING TI S.A.C.
No emite comprobantes electrónicos: solo registra y concilia lo que ya se
emitió en el SEE de SUNAT o un facturador/OSE. Acceso solo para admin.

## Stack

- Next.js 16.3.4 (App Router) + TypeScript + Tailwind CSS
- `@supabase/ssr` para auth y datos — **mismo proyecto Supabase que usan
  `bug-tracker` y `equipo-nexa`** (misma cuenta admin sirve para las tres
  apps; el rol `admin` de `profiles` es compartido).
- `xlsx` (SheetJS, build oficial desde cdn.sheetjs.com — el de npm tiene una
  vulnerabilidad sin parche) solo para generar reportes, nunca para leer
  archivos subidos.
- Supabase Storage (bucket privado `core-adjuntos`, RLS vía `is_admin()`)
  para los adjuntos de comprobantes y gastos.
- Dev en el puerto **3002** (3000 es bug-tracker, 3001 es equipo-nexa).
- Deploy: Netlify (`netlify.toml` con `@netlify/plugin-nextjs`).

## Modelo de datos

Tablas nuevas, todas prefijadas `core_` y con RLS (`is_admin()`):

- `core_clientes`, `core_servicios`, `core_comprobantes` (ingresos),
  `core_gastos`, `core_notas_cliente` (seguimiento por cliente),
  `core_configuracion` (fila única: RUC, razón social, régimen de Renta).

Ver `supabase/migrations/` para el detalle completo (0001 a 0004).

## Puesta en marcha

### 1. Variables de entorno

Ya está configurado `.env.local` apuntando al proyecto Supabase existente
(`ipfjxjyoxcidiphuklrk`). Si necesitas otro proyecto, copia
`.env.local.example` y aplica las migraciones de `supabase/migrations/` en
orden (requiere que `bug-tracker/supabase/migrations/0001_init.sql` ya esté
aplicado ahí, porque reutiliza `profiles`, `is_admin()` y `set_updated_at()`).

### 2. Instalar y correr

```bash
npm install
npm run dev
```

Abre http://localhost:3002 — inicia sesión con la misma cuenta admin que usas
en bug-tracker/equipo-nexa (el login es compartido).

## Estado por fase

- **Fase 1:** login, `/clientes` (listado con búsqueda/filtros + modal de
  alta) y `/clientes/[id]` (ficha con KPIs, edición y notas).
- **Fase 2:** `/ingresos` (filtros, totales, marcar cobrado/anular) y modal
  "Registrar movimiento" (switch ingreso/gasto, IGV en vivo).
- **Fase 3:** `/gastos` (gasto por categoría, punto de equilibrio) y
  `/panel` (KPIs del mes, barras de 5 meses, cobranzas, últimos
  movimientos).
- **Fase 4:** `GET /api/reporte` (Excel: Clientes, Ingresos, Gastos,
  Resumen mensual), adjuntos en Storage con URL firmada, `/configuracion`
  (régimen de Renta editable), y en `/panel`: cronograma de vencimientos
  SUNAT (según el dígito del RUC, tabla 2026) + estimado de IGV/Renta del
  mes. Todo informativo — nunca se envía nada a SUNAT.

Todas las fases están completas. El único punto abierto: el cronograma de
vencimientos SUNAT (`lib/sunat.ts`) tiene las fechas hardcodeadas para el
año 2026 — SUNAT publica un cronograma nuevo cada año, así que hay que
actualizar esa tabla cuando empiece 2027.

Los ítems de sidebar "Proyectos" del mockup original se omitieron: no
corresponden a ninguna pantalla pedida en el alcance de Nexa Core.
"Configuración" sí se agregó, pero acotado al régimen tributario (no es un
panel de ajustes general).
