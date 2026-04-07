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
}

const SLOTS_PER_HOUR = 4;
const WORKDAY_START_HOUR = 7;
const TOTAL_WORKDAY_HOURS = 13;
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

export function getTimeSlotIndex(value: string | null | undefined) {
  const time = value || "09:00";
  const [hour, minute] = time.split(":").map(Number);

  return ((hour - WORKDAY_START_HOUR) * SLOTS_PER_HOUR) + Math.floor((minute || 0) / 15);
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
}: AvailabilityOptions) {
  const availableMechanics = Math.max(mechanicCount, 1);
  const requestedSlot = getTimeSlotIndex(requestedTime);
  const serviceDuration = getServiceDurationSlots(serviceName);
  const dayAppointments = appointments.filter(
    (appointment) => appointment.date === date && !INACTIVE_STATUSES.has(appointment.status || "")
  );

  for (let slotOffset = 0; slotOffset < serviceDuration; slotOffset += 1) {
    const slotToCheck = requestedSlot + slotOffset;
    const busyCount = dayAppointments.filter((appointment) => {
      const appointmentStart = getTimeSlotIndex(appointment.time_slot);
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
}: AvailabilityOptions) {
  const requestedSlot = getTimeSlotIndex(requestedTime);

  for (let offset = 0; offset < TOTAL_WORKDAY_SLOTS; offset += 1) {
    for (const candidate of [requestedSlot + offset, requestedSlot - offset]) {
      if (candidate < 0 || candidate >= TOTAL_WORKDAY_SLOTS) {
        continue;
      }

      const canFit = hasMechanicAvailability({
        appointments,
        date,
        requestedTime: `${String(Math.floor(candidate / SLOTS_PER_HOUR) + WORKDAY_START_HOUR).padStart(2, "0")}:${String((candidate % SLOTS_PER_HOUR) * 15).padStart(2, "0")}`,
        serviceName,
        mechanicCount,
      });

      if (canFit) {
        const hour = Math.floor(candidate / SLOTS_PER_HOUR) + WORKDAY_START_HOUR;
        const minute = (candidate % SLOTS_PER_HOUR) * 15;

        return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      }
    }
  }

  return null;
}