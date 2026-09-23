import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { paginationSchema, type PaginationDto } from '@/common/dto';

import { Roles } from '../auth/decorators';
import { ShopService } from './shop.service';
import {
  createServiceSchema,
  updateServiceSchema,
  type CreateServiceDto,
  type UpdateServiceDto,
} from './dto/service.dto';
import {
  createShopSchema,
  updateShopSchema,
  type CreateShopDto,
  type UpdateShopDto,
} from './dto/shop.dto';

/**
 * 店铺与服务目录控制器。
 *
 * 路由（全局前缀 /api 叠加）：
 *  - GET    /shops
 *  - GET    /shops/:id
 *  - POST   /shops
 *  - PUT    /shops/:id
 *  - DELETE /shops/:id
 *  - GET    /shops/:id/services
 *  - POST   /shops/:id/services
 *  - PUT    /services/:id
 *  - DELETE /services/:id
 *
 * 由于 service 的更新/删除挂在 /services 根路径下，
 * 此处使用无 controller 前缀、方法上写完整路径的方式实现。
 */
@ApiTags('shop')
@ApiBearerAuth('access-token')
@Controller()
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get('shops')
  @Roles('owner', 'manager', 'stylist', 'assistant')
  @ApiOperation({ summary: '店铺列表', description: '分页查询店铺列表' })
  async listShops(
    @Query(new ZodValidationPipe(paginationSchema)) query: PaginationDto,
  ) {
    return this.shopService.listShops(query);
  }

  @Get('shops/:id')
  @ApiOperation({ summary: '店铺详情' })
  async getShop(@Param('id') id: string) {
    return this.shopService.getShop(id);
  }

  @Post('shops')
  @Roles('owner')
  @ApiOperation({ summary: '创建店铺' })
  async createShop(
    @Body(new ZodValidationPipe(createShopSchema)) dto: CreateShopDto,
  ) {
    return this.shopService.createShop(dto);
  }

  @Put('shops/:id')
  @Roles('owner', 'manager')
  @ApiOperation({ summary: '更新店铺' })
  async updateShop(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateShopSchema)) dto: UpdateShopDto,
  ) {
    return this.shopService.updateShop(id, dto);
  }

  @Delete('shops/:id')
  @Roles('owner')
  @ApiOperation({ summary: '删除店铺' })
  async deleteShop(@Param('id') id: string) {
    return this.shopService.deleteShop(id);
  }

  // ---------- Service 服务目录 ----------

  @Get('shops/:id/services')
  @ApiOperation({ summary: '店铺服务列表', description: '分页查询某店铺下的服务项目' })
  async listServices(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(paginationSchema)) query: PaginationDto,
  ) {
    return this.shopService.listServices(id, query);
  }

  @Post('shops/:id/services')
  @Roles('owner', 'manager')
  @ApiOperation({ summary: '创建服务项目' })
  async createService(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createServiceSchema)) dto: CreateServiceDto,
  ) {
    return this.shopService.createService(id, dto);
  }

  @Put('services/:id')
  @Roles('owner', 'manager')
  @ApiOperation({ summary: '更新服务项目' })
  async updateService(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateServiceSchema)) dto: UpdateServiceDto,
  ) {
    return this.shopService.updateService(id, dto);
  }

  @Delete('services/:id')
  @Roles('owner', 'manager')
  @ApiOperation({ summary: '删除服务项目' })
  async deleteService(@Param('id') id: string) {
    return this.shopService.deleteService(id);
  }
}