import type { Prisma } from '@prisma/client';

/**
 * Appointment 预约 entity 类型 re-export（AppointmentModule）。
 */
export type Appointment = Prisma.AppointmentGetPayload<Record<string, never>>;
