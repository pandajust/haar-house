import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, MemberCardType, MemberCardStatus } from '@prisma/client';

import type { PaginationDto, PaginatedResult } from '@/common/dto';
import { PrismaService } from '@/prisma/prisma.service';

import type { CreateCardDto, RechargeDto } from './dto';

/**
 * 会员卡服务：发卡、充值、查询、流水。
 *
 * 充值操作包在 $transaction 中：余额更新 + 充值流水原子提交。
 */
@Injectable()
export class MemberCardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 列表查询会员卡。
   */
  async listCards(filters: {
    clientId?: string;
    type?: string;
    status?: string;
  }) {
    const where: Prisma.MemberCardWhereInput = {};
    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.type) where.type = filters.type as MemberCardType;
    if (filters.status) where.status = filters.status as MemberCardStatus;

    return this.prisma.memberCard.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true, phone: true } },
      },
    });
  }

  /**
   * 会员卡详情（含流水列表）。
   */
  async getCard(id: string) {
    const card = await this.prisma.memberCard.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
    if (!card) throw new NotFoundException('会员卡不存在');
    return card;
  }

  /**
   * 发卡。
   *
   * - stored_value：必须有 balance
   * - times / package：必须有 remainingTimes
   * - boundServices：次卡/套餐绑定的服务 id 列表（Unsupported uuid[]，原样写入）
   */
  async createCard(data: CreateCardDto) {
    const { clientId, type, balance, remainingTimes, boundServices, expiredAt } =
      data;

    return this.prisma.memberCard.create({
      data: {
        clientId,
        type,
        balance: balance ?? 0,
        remainingTimes,
        expiredAt,
        ...(boundServices ? { boundServices } : {}),
      } as Prisma.MemberCardUncheckedCreateInput,
    });
  }

  /**
   * 储值卡充值：balance += amount，写充值流水。
   *
   * 事务内：更新余额 + 创建 CardTransaction(type=recharge, delta=+amount)。
   */
  async rechargeCard(id: string, dto: RechargeDto) {
    const card = await this.prisma.memberCard.findUnique({ where: { id } });
    if (!card) throw new NotFoundException('会员卡不存在');
    if (card.type !== 'stored_value') {
      throw new BadRequestException('仅储值卡可充值');
    }

    const amount = new Prisma.Decimal(dto.amount);

    return this.prisma.$transaction(async (tx) => {
      const balanceAfter = card.balance.plus(amount);
      await tx.memberCard.update({
        where: { id },
        data: { balance: balanceAfter },
      });
      return tx.cardTransaction.create({
        data: {
          cardId: id,
          type: 'recharge',
          delta: amount,
          reason: '充值',
          balanceAfter,
        },
      });
    });
  }

  /**
   * 分页查询卡流水。
   */
  async listTransactions(
    cardId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<any>> {
    const { page, page_size } = pagination;
    const skip = (page - 1) * page_size;

    const where: Prisma.CardTransactionWhereInput = { cardId };

    const [list, total] = await this.prisma.$transaction([
      this.prisma.cardTransaction.findMany({
        where,
        skip,
        take: page_size,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.cardTransaction.count({ where }),
    ]);

    return { list, total, page, page_size };
  }
}