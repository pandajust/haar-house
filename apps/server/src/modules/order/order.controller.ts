import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { paginationSchema, type PaginationDto } from '@/common/dto';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';

import { Roles } from '../auth/decorators';
import { createOrderSchema, refundSchema, type CreateOrderDto, type RefundDto } from './dto';
import { OrderService } from './order.service';

/**
 * 订单控制器：开单收银、查询、退款。
 *
 * 路径前缀 /orders，全局前缀 /api 叠加后为 /api/orders。
 */
@ApiTags('orders')
@ApiBearerAuth('access-token')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @Roles('owner', 'manager', 'stylist')
  @ApiOperation({
    summary: '分页查询订单',
    description: '支持按客户/理发师姓名关键字搜索',
  })
  async list(
    @Query(new ZodValidationPipe(paginationSchema)) query: PaginationDto,
  ) {
    return this.orderService.listOrders(query);
  }

  @Get(':id')
  @Roles('owner', 'manager', 'stylist')
  @ApiOperation({ summary: '订单详情', description: '含 orderItems 明细' })
  async get(@Param('id') id: string) {
    return this.orderService.getOrder(id);
  }

  @Post()
  @Roles('owner', 'manager', 'stylist')
  @ApiOperation({
    summary: '开单 + 收银',
    description:
      '一个事务内完成会员卡扣减（如有）+ 订单创建；卡余额/次数不足则回滚',
  })
  async create(
    @Body(new ZodValidationPipe(createOrderSchema)) dto: CreateOrderDto,
  ) {
    return this.orderService.createOrder(dto);
  }

  @Post(':id/refund')
  @Roles('owner', 'manager')
  @ApiOperation({
    summary: '退款',
    description:
      '全退或部分退；会员卡支付的订单会回充卡余额/次数并写退款流水',
  })
  async refund(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(refundSchema)) dto: RefundDto,
  ) {
    return this.orderService.refundOrder(id, dto);
  }
}