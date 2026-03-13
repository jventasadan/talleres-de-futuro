// Estimated repair times in minutes for common services
export const SERVICE_TIME_ESTIMATES: Record<string, number> = {
  "Cambio de aceite": 45,
  "Cambio de correas": 120,
  "Cambiar correa de distribución": 240,
  "Cambio de filtros": 30,
  "Frenos": 120,
  "Neumáticos": 60,
  "Revisión general": 90,
  "ITV Pre-inspección": 60,
  "Diagnóstico": 60,
  "Electricidad": 120,
  "Aire acondicionado": 90,
  "Chapa y pintura": 480,
  "Cambio de embrague": 300,
  "Cambio de amortiguadores": 120,
  "Alineación y equilibrado": 45,
  "Cambio de batería": 30,
  "Cambio de bujías": 60,
  "Cambio de escape": 90,
  "Reparación de dirección": 180,
  "Cambio de radiador": 120,
  "Otro": 60,
};

export const SERVICES = Object.keys(SERVICE_TIME_ESTIMATES);

export function getEstimatedMinutes(service: string): number {
  return SERVICE_TIME_ESTIMATES[service] ?? 60;
}

export function getEstimatedSlots(service: string): number {
  const minutes = getEstimatedMinutes(service);
  return Math.ceil(minutes / 30); // 30-min slots
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}
