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

import { paginationSchema, PaginationDto } from '@/common/dto';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';

import { Roles } from '../auth/decorators';

import { ClientService } from './client.service';
import {
  createClientSchema,
  CreateClientDto,
  updateClientSchema,
  UpdateClientDto,
} from './dto/client.dto';

/**
 * 客户档案控制器。
 *
 * 路由前缀 /clients，全局前缀 /api 叠加后实际路径为 /api/clients。
 * 受全局 JwtAuthGuard 保护（需登录），部分路由叠加 @Roles 做角色限制。
 */
@ApiTags('clients')
@ApiBearerAuth('access-token')
@Controller('clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  /**
   * 客户列表。
   *
   * 角色：owner / manager / stylist / assistant 均可查看。
   * 支持 keyword 模糊搜索（name / phone）。
   */
  @Get()
  @Roles('owner', 'manager', 'stylist', 'assistant')
  @ApiOperation({
    summary: '客户列表',
    description: '分页查询客户，支持 keyword 模糊搜索姓名/手机号',
  })
  async list(
    @Query(new ZodValidationPipe(paginationSchema)) query: PaginationDto,
  ) {
    return this.clientService.listClients(query);
  }

  /**
   * 客户详情。
   */
  @Get(':id')
  @ApiOperation({ summary: '客户详情' })
  async get(@Param('id') id: string) {
    return this.clientService.getClient(id);
  }

  /**
   * 创建客户。
   *
   * 角色：owner / manager。
   */
  @Post()
  @Roles('owner', 'manager')
  @ApiOperation({ summary: '创建客户档案' })
  async create(
    @Body(new ZodValidationPipe(createClientSchema)) dto: CreateClientDto,
  ) {
    return this.clientService.createClient(dto);
  }

  /**
   * 更新客户。
   *
   * 角色：owner / manager。
   */
  @Put(':id')
  @Roles('owner', 'manager')
  @ApiOperation({ summary: '更新客户档案' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateClientSchema)) dto: UpdateClientDto,
  ) {
    return this.clientService.updateClient(id, dto);
  }

  /**
   * 删除客户。
   *
   * 角色：owner。
   */
  @Delete(':id')
  @Roles('owner')
  @ApiOperation({ summary: '删除客户档案' })
  async remove(@Param('id') id: string) {
    return this.clientService.deleteClient(id);
  }
}