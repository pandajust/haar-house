import { z } from 'zod';

import { strictObject } from '@/common/pipes/zod-validation.pipe';

/**
 * 订单明细行 schema。
 */
const orderItemSchema = strictObject({
  serviceId: z.string().min(1),
  staffId: z.string().min(1),
  qty: z.number().int().min(1),
  price: z.coerce.number().positive(),
});

/**
 * 开单 + 收银入参。
 */
export const createOrderSchema = strictObject({
  clientId: z.string().min(1).optional(),
  staffId: z.string().min(1),
  items: z.array(orderItemSchema).min(1),
  payMethod: z.enum(['cash', 'wechat', 'card_balance', 'card_times', 'mixed']),
  discount: z.coerce.number().min(0).default(0),
});

export type CreateOrderDto = z.infer<typeof createOrderSchema>;
export type OrderItemDto = z.infer<typeof orderItemSchema>;

/**
 * 退款入参。
 */
export const refundSchema = strictObject({
  amount: z.coerce.number().positive().optional(),
});

export type RefundDto = z.infer<typeof refundSchema>;