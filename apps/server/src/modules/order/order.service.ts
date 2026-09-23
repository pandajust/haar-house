import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { PaginationDto, PaginatedResult } from '@/common/dto';
import { PrismaService } from '@/prisma/prisma.service';

import type { CreateOrderDto, RefundDto } from './dto';

/**
 * 订单服务：开单 + 收银（含会员卡扣减）+ 退款。
 *
 * 所有写操作（createOrder / refundOrder）均包在 prisma.$transaction 中：
 *  - 会员卡余额/次数不足 → 抛 BadRequestException，事务自动回滚，订单不创建
 *  - 卡扣减 + 卡流水 + 订单 + 订单明细 原子提交
 *
 * M1 跨模块查表：OrderModule 直接通过 prisma.memberCard / prisma.cardTransaction
 * 操作会员卡表（模块化单体允许跨模块查表，spec 允许 M1 简化为直接用 Prisma）。
 */
@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 分页查询订单。
   */
  async listOrders(
    pagination: PaginationDto,
  ): Promise<PaginatedResult<any>> {
    const { page, page_size, sort, order, keyword } = pagination;
    const skip = (page - 1) * page_size;

    const where: Prisma.OrderWhereInput = keyword
      ? {
          OR: [
            { client: { name: { contains: keyword, mode: 'insensitive' } } },
            { staff: { name: { contains: keyword, mode: 'insensitive' } } },
          ],
        }
      : {};

    const orderBy: Prisma.OrderOrderByWithRelationInput = sort
      ? { [sort]: order }
      : { createdAt: order };

    const [list, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip,
        take: page_size,
        orderBy,
        include: {
          client: { select: { id: true, name: true, phone: true } },
          staff: { select: { id: true, name: true } },
          orderItems: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { list, total, page, page_size };
  }

  /**
   * 查询订单详情（含 orderItems）。
   */
  async getOrder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        staff: { select: { id: true, name: true } },
        orderItems: {
          include: {
            service: { select: { id: true, name: true } },
            staff: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!order) throw new NotFoundException('订单不存在');
    return order;
  }

  /**
   * 开单 + 收银（一个事务内完成会员卡扣减与订单创建）。
   *
   * total = sum(qty * price) - discount
   *
   * 支付方式：
   *  - cash / wechat：不涉及会员卡，直接创建订单
   *  - card_balance / mixed：扣减客户 active stored_value 卡余额
   *  - card_times：扣减客户 active times/package 卡次数（需 boundServices 覆盖所有明细服务）
   *
   * 卡余额/次数不足 → 抛 BadRequestException，事务回滚。
   */
  async createOrder(data: CreateOrderDto) {
    const { clientId, staffId, items, payMethod, discount } = data;

    // 计算明细总额
    const gross = items.reduce((sum, it) => sum + it.qty * it.price, 0);
    if (discount > gross) {
      throw new BadRequestException('优惠金额不能大于明细总额');
    }
    const total = new Prisma.Decimal(gross - discount);

    // 卡支付需要 clientId
    const needsCard =
      payMethod === 'card_balance' ||
      payMethod === 'card_times' ||
      payMethod === 'mixed';
    if (needsCard && !clientId) {
      throw new BadRequestException('会员卡支付必须指定客户');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let cardId: string | undefined;

      // ---- 会员卡扣减 ----
      if (payMethod === 'card_balance' || payMethod === 'mixed') {
        const card = await tx.memberCard.findFirst({
          where: {
            clientId,
            type: 'stored_value',
            status: 'active',
          },
        });
        if (!card) throw new BadRequestException('客户无可用储值卡');

        // M1 简化：mixed 也要求卡余额足额，不足则报错（不用 wechat 补）
        if (card.balance.lt(total)) {
          throw new BadRequestException('卡余额不足');
        }
        const balanceAfter = card.balance.minus(total);
        await tx.memberCard.update({
          where: { id: card.id },
          data: { balance: balanceAfter },
        });
        cardId = card.id;
        await tx.cardTransaction.create({
          data: {
            cardId: card.id,
            type: 'consume',
            delta: total.negated(),
            reason: '订单消费',
            balanceAfter,
          },
        });
      } else if (payMethod === 'card_times') {
        const card = await tx.memberCard.findFirst({
          where: {
            clientId,
            type: { in: ['times', 'package'] },
            status: 'active',
          },
        });
        if (!card) throw new BadRequestException('客户无可用次卡/套餐卡');

        // boundServices 为 Unsupported("uuid[]")，业务层 cast
        const bound = ((card as any).boundServices as string[] | null) ?? [];
        const allCovered = items.every((it) => bound.includes(it.serviceId));
        if (!allCovered) {
          throw new BadRequestException('次卡未绑定订单中的部分服务');
        }

        const totalTimes = items.reduce((s, it) => s + it.qty, 0);
        if ((card.remainingTimes ?? 0) < totalTimes) {
          throw new BadRequestException('卡剩余次数不足');
        }
        const remainingAfter = (card.remainingTimes ?? 0) - totalTimes;
        await tx.memberCard.update({
          where: { id: card.id },
          data: { remainingTimes: remainingAfter },
        });
        cardId = card.id;
        await tx.cardTransaction.create({
          data: {
            cardId: card.id,
            type: 'consume',
            deltaTimes: -totalTimes,
            reason: '订单消费（次卡）',
            balanceAfter: card.balance,
          },
        });
      }

      // ---- 创建订单 + 明细 ----
      const order = await tx.order.create({
        data: {
          clientId,
          staffId,
          payMethod,
          discount,
          total,
          status: 'paid',
          paidAt: new Date(),
          items: items.map((it) => ({
            serviceId: it.serviceId,
            staffId: it.staffId,
            qty: it.qty,
            price: it.price,
          })),
          orderItems: {
            create: items.map((it) => ({
              serviceId: it.serviceId,
              staffId: it.staffId,
              qty: it.qty,
              price: it.price,
            })),
          },
        },
        include: { orderItems: true },
      });

      // 卡流水回填 refOrderId
      if (cardId) {
        await tx.cardTransaction.updateMany({
          where: { cardId, refOrderId: null, type: 'consume' },
          data: { refOrderId: order.id },
        });
      }

      return order;
    });

    return result;
  }

  /**
   * 退款（全退或部分退）。
   *
   * - status → refunded，记录 refundAmount
   * - 若订单原支付方式为会员卡，则回充会员卡并写 CardTransaction(type=refund)
   * - 现金/微信退款仅标记订单状态，实际资金退付由线下/支付通道处理
   *
   * 事务内完成：订单更新 + 卡回充 + 卡流水。
   */
  async refundOrder(id: string, dto: RefundDto) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status === 'refunded') {
      throw new BadRequestException('订单已退款');
    }

    const refundAmount = new Prisma.Decimal(dto.amount ?? order.total);
    if (refundAmount.gt(order.total)) {
      throw new BadRequestException('退款金额不能大于订单总额');
    }

    return this.prisma.$transaction(async (tx) => {
      // 回充会员卡
      if (
        order.payMethod === 'card_balance' ||
        order.payMethod === 'mixed' ||
        order.payMethod === 'card_times'
      ) {
        const consumeTx = await tx.cardTransaction.findFirst({
          where: { refOrderId: id, type: 'consume' },
          orderBy: { createdAt: 'asc' },
        });
        if (consumeTx) {
          const card = await tx.memberCard.findUnique({
            where: { id: consumeTx.cardId },
          });
          if (card) {
            if (
              order.payMethod === 'card_balance' ||
              order.payMethod === 'mixed'
            ) {
              const balanceAfter = card.balance.plus(refundAmount);
              await tx.memberCard.update({
                where: { id: card.id },
                data: { balance: balanceAfter },
              });
              await tx.cardTransaction.create({
                data: {
                  cardId: card.id,
                  type: 'refund',
                  delta: refundAmount,
                  reason: '订单退款',
                  refOrderId: id,
                  balanceAfter,
                },
              });
            } else {
              // card_times：回充次数（全额回充已消费次数）
              const consumedTimes = Math.abs(consumeTx.deltaTimes ?? 0);
              const remainingAfter =
                (card.remainingTimes ?? 0) + consumedTimes;
              await tx.memberCard.update({
                where: { id: card.id },
                data: { remainingTimes: remainingAfter },
              });
              await tx.cardTransaction.create({
                data: {
                  cardId: card.id,
                  type: 'refund',
                  deltaTimes: consumedTimes,
                  reason: '订单退款（次卡）',
                  refOrderId: id,
                  balanceAfter: card.balance,
                },
              });
            }
          }
        }
      }

      return tx.order.update({
        where: { id },
        data: {
          status: 'refunded',
          refundAmount,
        },
      });
    });
  }
}