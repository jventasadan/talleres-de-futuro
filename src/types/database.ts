// Tipos de datos usados por la app (compatibles con esquemas antiguos y nuevos)
export interface AppointmentRow {
  id: string;
  status: string;
  client_name: string;
  license_plate: string;
  service: string;
  date: string;
  time_slot: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user_id?: string;
  client_id?: string | null;
  created_by?: string;

  // Compatibilidad con esquemas alternativos
  name?: string | null;
  appointment_date?: string | null;
  appointment_start?: string | null;
  appointment_end?: string | null;
  service_type?: string | null;
  problem?: string | null;
  phone?: string | null;
  brand?: string | null;
  model?: string | null;
  mechanic?: string | null;
  vehicle_id?: string | null;
}

export interface ClientRow {
  id: string;
  name: string;
  phone: string | null;
  license_plate: string;
  brand: string | null;
  model: string | null;
  created_at: string;
  updated_at: string;
  user_id?: string;

  // Compatibilidad con esquemas alternativos
  full_name?: string | null;
  nif?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  province?: string | null;
}

export interface OrderPartRow {
  id: string;
  appointment_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  created_at: string;
  user_id?: string;
}

export interface InvoiceRow {
  id: string;
  invoice_number: string;
  status: string;
  created_at: string;

  // Modelo usado por pantallas actuales
  appointment_id?: string;
  user_id?: string;
  client_name?: string;
  license_plate?: string;
  service?: string;
  parts_total?: number;
  labor_cost?: number;
  tax_rate?: number;
  total?: number;

  // Compatibilidad con esquemas alternativos
  client_id?: string | null;
  work_order_id?: string | null;
  series_id?: string | null;
  issue_date?: string | null;
  due_date?: string | null;
  subtotal?: number;
  vat_percentage?: number;
  vat_amount?: number;
  payment_method?: string | null;
  notes?: string | null;
  type?: string | null;
  parent_invoice_id?: string | null;
  vat_rate?: number;
  total_amount?: number;
  pdf_url?: string | null;
}
