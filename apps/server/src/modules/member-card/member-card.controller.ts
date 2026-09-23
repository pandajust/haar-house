import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { paginationSchema, type PaginationDto } from '@/common/dto';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';

import { Roles } from '../auth/decorators';
import {
  createCardSchema,
  rechargeSchema,
  type CreateCardDto,
  type RechargeDto,
} from './dto';
import { MemberCardService } from './member-card.service';

/**
 * 会员卡控制器：发卡、充值、查询、流水。
 *
 * 路径前缀 /member-cards，全局前缀 /api 叠加后为 /api/member-cards。
 */
@ApiTags('member-cards')
@ApiBearerAuth('access-token')
@Controller('member-cards')
export class MemberCardController {
  constructor(private readonly cardService: MemberCardService) {}

  @Get()
  @Roles('owner', 'manager', 'stylist')
  @ApiOperation({
    summary: '查询会员卡列表',
    description: '可按 clientId / type / status 过滤',
  })
  async list(
    @Query('clientId') clientId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.cardService.listCards({ clientId, type, status });
  }

  @Get(':id')
  @Roles('owner', 'manager', 'stylist')
  @ApiOperation({ summary: '会员卡详情', description: '含最近 50 条流水' })
  async get(@Param('id') id: string) {
    return this.cardService.getCard(id);
  }

  @Post()
  @Roles('owner', 'manager')
  @ApiOperation({
    summary: '发卡',
    description:
      '储值卡必须传 balance；次卡/套餐必须传 remainingTimes',
  })
  async create(
    @Body(new ZodValidationPipe(createCardSchema)) dto: CreateCardDto,
  ) {
    return this.cardService.createCard(dto);
  }

  @Post(':id/recharge')
  @Roles('owner', 'manager')
  @ApiOperation({
    summary: '储值卡充值',
    description: 'balance += amount，写充值流水（事务）',
  })
  async recharge(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rechargeSchema)) dto: RechargeDto,
  ) {
    return this.cardService.rechargeCard(id, dto);
  }

  @Get(':id/transactions')
  @Roles('owner', 'manager', 'stylist')
  @ApiOperation({ summary: '卡流水分页查询' })
  async transactions(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(paginationSchema)) query: PaginationDto,
  ) {
    return this.cardService.listTransactions(id, query);
  }
}