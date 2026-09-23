import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@/prisma';
import type { PaginationDto, PaginatedResult } from '@/common/dto';

import type { Shop } from './entities/shop.entity';
import type { Service } from './entities/service.entity';
import type { CreateShopDto, UpdateShopDto } from './dto/shop.dto';
import type { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';

/**
 * 店铺与服务目录业务服务。
 *
 * 直接通过 PrismaService 操作 shop / service 表。
 * businessHours 存储为 jsonb，Prisma Json 字段直接透传数组。
 */
@Injectable()
export class ShopService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 分页查询店铺列表。
   */
  async listShops(pagination: PaginationDto): Promise<PaginatedResult<Shop>> {
    const { page, page_size, keyword } = pagination;
    const skip = (page - 1) * page_size;
    const where = keyword
      ? { name: { contains: keyword, mode: 'insensitive' as const } }
      : undefined;

    const [list, total] = await Promise.all([
      this.prisma.shop.findMany({
        where,
        skip,
        take: page_size,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.shop.count({ where }),
    ]);

    return { list, total, page, page_size };
  }

  /**
   * 获取单个店铺详情。
   */
  async getShop(id: string): Promise<Shop> {
    const shop = await this.prisma.shop.findUnique({ where: { id } });
    if (!shop) {
      throw new NotFoundException(`店铺不存在: ${id}`);
    }
    return shop;
  }

  /**
   * 创建店铺。
   */
  async createShop(data: CreateShopDto): Promise<Shop> {
    return this.prisma.shop.create({ data });
  }

  /**
   * 更新店铺。
   */
  async updateShop(id: string, data: UpdateShopDto): Promise<Shop> {
    await this.getShop(id);
    return this.prisma.shop.update({ where: { id }, data });
  }

  /**
   * 删除店铺。
   */
  async deleteShop(id: string): Promise<Shop> {
    await this.getShop(id);
    return this.prisma.shop.delete({ where: { id } });
  }

  // ---------- Service 服务目录 ----------

  /**
   * 分页查询某店铺下的服务项目。
   */
  async listServices(
    shopId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<Service>> {
    const { page, page_size, keyword } = pagination;
    const skip = (page - 1) * page_size;
    const where = keyword
      ? { shopId, name: { contains: keyword, mode: 'insensitive' as const } }
      : { shopId };

    const [list, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        skip,
        take: page_size,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.service.count({ where }),
    ]);

    return { list, total, page, page_size };
  }

  /**
   * 获取单个服务项目。
   */
  async getService(id: string): Promise<Service> {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) {
      throw new NotFoundException(`服务项目不存在: ${id}`);
    }
    return service;
  }

  /**
   * 创建服务项目。
   */
  async createService(shopId: string, data: CreateServiceDto): Promise<Service> {
    return this.prisma.service.create({
      data: { ...data, shopId },
    });
  }

  /**
   * 更新服务项目。
   */
  async updateService(id: string, data: UpdateServiceDto): Promise<Service> {
    await this.getService(id);
    return this.prisma.service.update({ where: { id }, data });
  }

  /**
   * 删除服务项目。
   */
  async deleteService(id: string): Promise<Service> {
    await this.getService(id);
    return this.prisma.service.delete({ where: { id } });
  }
}