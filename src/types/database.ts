// Custom types matching external Supabase schema
export interface AppointmentRow {
  id: string;
  client_id: string | null;
  vehicle_id: string | null;
  appointment_date: string | null;
  service_type: string | null;
  status: string | null;
  notes: string | null;
  created_at: string;
  name: string | null;
  brand: string | null;
  model: string | null;
  license_plate: string | null;
  problem: string | null;
  phone: string | null;
  appointment_start: string | null;
  appointment_end: string | null;
  mechanic: string | null;
}

export interface ClientRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  province: string | null;
  nif: string | null;
  created_at: string;
}
