# Nexa Core

Gestión interna de clientes, cobros y gastos para NEXA CONSULTING TI S.A.C.
No emite comprobantes electrónicos: solo registra y concilia lo que ya se
emitió en el SEE de SUNAT o un facturador/OSE. Acceso solo para admin.

## Stack

- Next.js 16.3.4 (App Router) + TypeScript + Tailwind CSS
- `@supabase/ssr` para auth y datos — **mismo proyecto Supabase que usan
  `bug-tracker` y `equipo-nexa`** (misma cuenta admin sirve para las tres
  apps; el rol `admin` de `profiles` es compartido).
- `xlsx` (SheetJS) para generar reportes (Fase 4), nunca para leer archivos
  subidos.
- Dev en el puerto **3002** (3000 es bug-tracker, 3001 es equipo-nexa).

## Modelo de datos

Tablas nuevas, todas prefijadas `core_` y con RLS (`is_admin()`):

- `core_clientes`, `core_servicios`, `core_comprobantes` (ingresos),
  `core_gastos`, `core_notas_cliente` (seguimiento por cliente).

Ver `supabase/migrations/0001_core_init.sql` para el detalle completo.

## Puesta en marcha

### 1. Variables de entorno

Ya está configurado `.env.local` apuntando al proyecto Supabase existente
(`ipfjxjyoxcidiphuklrk`). Si necesitas otro proyecto, copia
`.env.local.example` y aplica `supabase/migrations/0001_core_init.sql`
(requiere que `bug-tracker/supabase/migrations/0001_init.sql` ya esté
aplicado ahí, porque reutiliza `profiles`, `is_admin()` y `set_updated_at()`).

### 2. Instalar y correr

```bash
npm install
npm run dev
```

Abre http://localhost:3002 — inicia sesión con la misma cuenta admin que usas
en bug-tracker/equipo-nexa (el login es compartido).

## Estado por fase

- **Fase 1 (lista):** login, `/clientes` (listado con búsqueda/filtros +
  modal de alta) y `/clientes/[id]` (ficha con KPIs, edición y notas).
- **Fase 2:** `/ingresos`, cobranzas, modal "Registrar movimiento".
- **Fase 3:** `/gastos`, `/panel`.
- **Fase 4:** `GET /api/reporte` (Excel) + adjuntos en Storage + cronograma
  de vencimientos SUNAT y cálculo estimado de IGV/Renta (régimen MYPE
  Tributario, configurable).

Los ítems de sidebar "Proyectos" y "Configuración" del mockup original se
omitieron por ahora: no corresponden a ninguna pantalla pedida en el
alcance de Nexa Core.
