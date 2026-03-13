

## Plan: Correcciones de Base de Datos y Funcionalidades Pendientes

### Diagnóstico del problema raíz

Hay una desconexión entre el esquema de la base de datos y lo que el código envía. Los errores principales son:

1. **`brand` column not found en `clients`**: La columna existe en el esquema pero PostgREST no ha actualizado su caché interna tras la migración.
2. **`order_parts` table not found**: Mismo problema de caché -- la tabla existe pero PostgREST no la detecta.
3. **`invoices_work_order_id_fkey` FK violation**: Existe una constraint FK residual que referencia una columna/tabla que no debería usarse. El código intenta enviar `work_order_id` pero la tabla solo tiene `appointment_id`.
4. **Edge function `mechanic-chat`**: No tiene logs -- necesita redeployment.

---

### Tareas de implementación

#### 1. Migración DB: Refrescar caché + crear tablas de configuración
- Ejecutar `NOTIFY pgrst, 'reload schema'` para forzar la recarga del caché de PostgREST (resuelve errores de `brand`, `order_parts`).
- Eliminar la FK residual `invoices_work_order_id_fkey` si existe.
- Eliminar el CHECK constraint de `status` en appointments (limita los valores permitidos a los originales y no permite `recepcionado`, `en_reparacion`, etc.).
- Crear tabla `workshop_settings` (labor_rate, nombre taller, CIF, dirección, etc.).
- Crear tabla `mechanics` (id, user_id, name, active, created_at).
- Crear tabla `appointment_photos` (id, appointment_id, user_id, photo_url, created_at) + storage bucket para fotos.

#### 2. Fix hooks de datos (`useClients`, `useOrderParts`, `useInvoices`)
- **useClients**: Simplificar `tryInsertClient` -- un solo payload con `name`, `phone`, `license_plate`, `brand`, `model`, `user_id`. Eliminar la lógica de múltiples intentos con `full_name`.
- **useOrderParts**: Verificar que usa tabla `order_parts` (ya lo hace, el error es de caché).
- **useInvoices**: Eliminar `work_order_id` del payload. Usar solo `appointment_id`. Eliminar el `modernPayload` que causa el FK error.
- Añadir hooks: `useUpdateClient`, `useDeleteClient`, `useDeleteAppointment`, `useMechanics`, `useWorkshopSettings`.

#### 3. Clientes: Diálogo de detalle editable
- Al hacer clic en un cliente, abrir un diálogo/sheet con todos sus datos: nombre, teléfono, matrícula, marca, modelo.
- Campos editables con botón guardar.
- Sección "Historial de reparaciones": consulta a `appointments` filtrado por `license_plate` o `client_name`.
- Botón "Eliminar cliente" con confirmación.

#### 4. Órdenes de Trabajo: Fotos, eliminar, mecánicos, facturación inteligente
- En cada tarjeta del Kanban, añadir opciones:
  - **Subir foto**: Abrir input file, subir a storage bucket, guardar referencia en `appointment_photos`.
  - **Eliminar orden**: Con confirmación, eliminar de `appointments`.
  - **Asignar mecánico**: Selector con lista de mecánicos del taller.
- **Al mover a "Listo"**: Antes de generar factura, mostrar diálogo pidiendo:
  - Horas de mano de obra (input numérico).
  - Descuento en % (input numérico, default 0).
  - Calcular: precio = (horas × tarifa/hora de settings) + total piezas - descuento%.
- Generar factura con datos del taller (de `workshop_settings`), datos del cliente, desglose completo.

#### 5. Calendario: Mecánicos, estimación de tiempo, funcionalidades faltantes
- **Botón "Hoy"**: Ya existe pero no hace nada visible -- corregir para que navegue y resalte el día actual.
- **Clic en cita**: Abrir diálogo mostrando datos del cliente y problema del coche.
- **Reservar cita**: Añadir campo editable "Descripción del problema" vinculado a `notes` o columna de problema.
- **Estimación de tiempo por servicio**: Diccionario con las 20 averías más comunes y sus tiempos estimados:
  - Cambio de aceite: 45min, Frenos: 2h, Distribución: 4h, Neumáticos: 1h, Diagnóstico: 1h, etc.
- **Calcular disponibilidad por mecánico**: Al reservar, verificar que el mecánico asignado no tiene otra cita solapada según el tiempo estimado del servicio.

#### 6. Asistente IA: Redesplegar edge function
- Redesplegar la edge function `mechanic-chat` (sin cambios de código, solo forzar deploy).
- Si persiste, verificar que `LOVABLE_API_KEY` está configurado como secret.

#### 7. Configuración: Tarifa de mano de obra + mecánicos
- Añadir card "Tarifas" con campo "Precio hora mano de obra" (guardado en `workshop_settings`).
- Añadir card "Mecánicos del taller":
  - Lista de mecánicos actuales.
  - Botón "Añadir mecánico" con input de nombre.
  - Opción de eliminar mecánico.
- Todos los datos se persisten en las nuevas tablas y se usan en calendario y facturación.

---

### Detalle técnico

**Nuevas tablas:**
```text
workshop_settings
├── id (uuid PK)
├── user_id (uuid, NOT NULL)
├── workshop_name (text)
├── cif (text)
├── address (text)
├── phone (text)
├── email (text)
├── labor_rate (numeric, default 35)
└── created_at / updated_at

mechanics
├── id (uuid PK)
├── user_id (uuid, NOT NULL)
├── name (text, NOT NULL)
├── active (boolean, default true)
└── created_at

appointment_photos
├── id (uuid PK)
├── appointment_id (uuid FK → appointments)
├── user_id (uuid, NOT NULL)
├── photo_url (text, NOT NULL)
└── created_at
```

**Archivos a crear:**
- `src/hooks/useMechanics.ts`
- `src/hooks/useWorkshopSettings.ts`
- `src/hooks/useAppointmentPhotos.ts`
- `src/components/clients/ClientDetailDialog.tsx`
- `src/components/appointments/LaborDialog.tsx` (diálogo horas + descuento)
- `src/components/appointments/PhotoUpload.tsx`
- `src/components/appointments/AppointmentDetailDialog.tsx`
- `src/components/settings/MechanicsManager.tsx`

**Archivos a modificar:**
- `src/hooks/useClients.ts` -- simplificar insert, añadir update/delete
- `src/hooks/useInvoices.ts` -- eliminar work_order_id
- `src/pages/Clients.tsx` -- añadir ClientDetailDialog
- `src/pages/Appointments.tsx` -- fotos, eliminar, mecánicos, LaborDialog
- `src/pages/WeeklyCalendar.tsx` -- disponibilidad mecánicos, detalle cita, estimación tiempo
- `src/pages/Settings.tsx` -- tarifas y mecánicos
- `src/components/appointments/ReceptionDialog.tsx` -- campo problema editable
- `supabase/functions/mechanic-chat/index.ts` -- redeploy

