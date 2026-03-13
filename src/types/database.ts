// Types matching Cloud Supabase schema
export interface AppointmentRow {
  id: string;
  user_id: string;
  client_id: string | null;
  date: string;
  time_slot: string;
  client_name: string;
  license_plate: string;
  service: string;
  status: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ClientRow {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  license_plate: string;
  brand: string | null;
  model: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderPartRow {
  id: string;
  appointment_id: string;
  user_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  created_at: string;
}

export interface InvoiceRow {
  id: string;
  appointment_id: string;
  user_id: string;
  invoice_number: string;
  client_name: string;
  license_plate: string;
  service: string;
  parts_total: number;
  labor_cost: number;
  tax_rate: number;
  total: number;
  status: string;
  created_at: string;
}
