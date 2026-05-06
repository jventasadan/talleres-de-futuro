import { getEstimatedMinutes } from "@/lib/serviceEstimates";

export interface SchedulableAppointment {
  date: string;
  time_slot?: string | null;
  service?: string | null;
  status?: string | null;
}

interface AvailabilityOptions {
  appointments: SchedulableAppointment[];
  date: string;
  requestedTime: string;
  serviceName: string;
  mechanicCount: number;
  openingTime?: string;
  closingTime?: string;
}

const SLOTS_PER_HOUR = 4;
// FIX: usar 0 como base y calcular desde opening_time dinámicamente
const WORKDAY_START_HOUR = 9; // hora real de apertura por defecto
const WORKDAY_END_HOUR = 18;  // hora real de cierre por defecto
const TOTAL_WORKDAY_HOURS = WORKDAY_END_HOUR - WORKDAY_START_HOUR;
const TOTAL_WORKDAY_SLOTS = TOTAL_WORKDAY_HOURS * SLOTS_PER_HOUR;

const INACTIVE_STATUSES = new Set(["entregado", "cancelado"]);

export function buildKilometersPayload(value: string | null | undefined) {
  const normalized = value?.trim() || null;
  return {
    km: normalized,
    kilometros: normalized,
    Kilometros: normalized,
  };
}

export function getTimeSlotIndex(
  value: string | null | undefined,
  startHour: number = WORKDAY_START_HOUR
) {
  const time = value || "09:00";
  const [hour, minute] = time.split(":").map(Number);
  return ((hour - startHour) * SLOTS_PER_HOUR) + Math.floor((minute || 0) / 15);
}

export function getServiceDurationSlots(serviceName: string | null | undefined) {
  return Math.max(2, Math.ceil(getEstimatedMinutes(serviceName || "") / 15));
}

export function hasMechanicAvailability({
  appointments,
  date,
  requestedTime,
  serviceName,
  mechanicCount,
  openingTime = "09:00",
  closingTime = "18:00",
}: AvailabilityOptions) {
  const availableMechanics = Math.max(mechanicCount, 1);
  const [openH] = openingTime.split(":").map(Number);
  const [closeH] = closingTime.split(":").map(Number);
  
  const requestedSlot = getTimeSlotIndex(requestedTime, openH);
  const serviceDuration = getServiceDurationSlots(serviceName);
  const totalSlots = (closeH - openH) * SLOTS_PER_HOUR;

  // FIX: No permitir slots fuera del horario
  if (requestedSlot < 0 || requestedSlot >= totalSlots) {
    return false;
  }

  const dayAppointments = appointments.filter(
    (appointment) => appointment.date === date && 
    !INACTIVE_STATUSES.has(appointment.status || "")
  );

  for (let slotOffset = 0; slotOffset < serviceDuration; slotOffset += 1) {
    const slotToCheck = requestedSlot + slotOffset;
    if (slotToCheck >= totalSlots) return false;

    const busyCount = dayAppointments.filter((appointment) => {
      const appointmentStart = getTimeSlotIndex(appointment.time_slot, openH);
      const appointmentDuration = getServiceDurationSlots(appointment.service);
      return slotToCheck >= appointmentStart && slotToCheck < appointmentStart + appointmentDuration;
    }).length;

    if (busyCount >= availableMechanics) {
      return false;
    }
  }
  return true;
}

export function findNearestAvailableSlot({
  appointments,
  date,
  requestedTime,
  serviceName,
  mechanicCount,
  openingTime = "09:00",
  closingTime = "18:00",
}: AvailabilityOptions) {
  const [openH] = openingTime.split(":").map(Number);
  const [closeH] = closingTime.split(":").map(Number);
  const totalSlots = (closeH - openH) * SLOTS_PER_HOUR;
  const requestedSlot = getTimeSlotIndex(requestedTime, openH);

  for (let offset = 0; offset < totalSlots; offset += 1) {
    for (const candidate of [requestedSlot + offset, requestedSlot - offset]) {
      // FIX: nunca salir del horario del taller
      if (candidate < 0 || candidate >= totalSlots) continue;

      const candidateHour = Math.floor(candidate / SLOTS_PER_HOUR) + openH;
      const candidateMinute = (candidate % SLOTS_PER_HOUR) * 15;
      const candidateTime = `${String(candidateHour).padStart(2, "0")}:${String(candidateMinute).padStart(2, "0")}`;

      const canFit = hasMechanicAvailability({
        appointments,
        date,
        requestedTime: candidateTime,
        serviceName,
        mechanicCount,
        openingTime,
        closingTime,
      });

      if (canFit) {
        return candidateTime;
      }
    }
  }
  return null;
}
