import type { ClientInfo } from '@/store/user';
import { request } from '@/utils/request';

/**
 * 后端 API 契约定义。
 * 后端默认地址 http://localhost:3000，开发期 project.config.json 关闭域名校验。
 * 后端 API 前缀为 /api（非 /api/v1）。
 */

/* ===================== 鉴权 ===================== */

export interface WxLoginRequest {
  code: string;
}

export interface WxLoginResponse {
  access_token: string;
  refresh_token: string;
  client: ClientInfo;
}

export interface ClientProfile extends ClientInfo {
  phone?: string;
  gender?: 'male' | 'female' | 'unknown';
}

/**
 * 微信登录：POST /api/auth/wx-login
 * body: { code: string }
 * 返回: { access_token, refresh_token, client: { id, name, avatar } }
 *
 * 注意：登录接口本身不携带 Authorization（skipAuth=true），
 * 否则会因为无 token 触发 ensureLogin → 死循环。
 */
export function wxLoginApi(payload: WxLoginRequest): Promise<WxLoginResponse> {
  return request<WxLoginResponse>({
    url: '/api/auth/wx-login',
    method: 'POST',
    data: payload,
    skipAuth: true,
  });
}

/**
 * 获取当前登录用户：GET /api/auth/me
 */
export function getMe(): Promise<ClientProfile> {
  return request<ClientProfile>({
    url: '/api/auth/me',
    method: 'GET',
  });
}

/* ===================== 店铺 ===================== */

export interface Shop {
  id: number;
  name: string;
  address: string;
  businessHours: string;
  phone?: string;
}

/**
 * 获取店铺信息：GET /api/shops/:id
 */
export function getShop(id = 1): Promise<Shop> {
  return request<Shop>({
    url: `/api/shops/${id}`,
    method: 'GET',
  });
}

/* ===================== 服务目录 ===================== */

export interface ServiceItem {
  id: number;
  name: string;
  description?: string;
  price: number;
  duration: number; // 分钟
  shopId: number;
  category?: string;
}

/**
 * 获取服务列表：GET /api/shops/:shopId/services
 */
export function listServices(shopId = 1): Promise<ServiceItem[]> {
  return request<ServiceItem[]>({
    url: `/api/shops/${shopId}/services`,
    method: 'GET',
  });
}

/* ===================== 员工 / 理发师 ===================== */

export interface Staff {
  id: number;
  name: string;
  avatar?: string;
  title?: string;
  shopId: number;
}

/**
 * 获取员工列表：GET /api/staff
 */
export function listStaff(): Promise<Staff[]> {
  return request<Staff[]>({
    url: `/api/staff`,
    method: 'GET',
  });
}

/* ===================== 预约 ===================== */

export interface TimeSlot {
  time: string; // HH:mm
  available: boolean;
}

export interface CreateAppointmentRequest {
  serviceId: number;
  staffId: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  remark?: string;
}

export interface Appointment {
  id: number;
  serviceId: number;
  serviceName: string;
  staffId: number;
  staffName: string;
  clientId: string;
  date: string;
  time: string;
  remark?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
}

/**
 * 获取可预约时段：GET /api/appointments/slots?staffId=xxx&date=xxx
 */
export function getSlots(staffId: number, date: string): Promise<TimeSlot[]> {
  return request<TimeSlot[]>({
    url: `/api/appointments/slots?staffId=${staffId}&date=${date}`,
    method: 'GET',
  });
}

/**
 * 创建预约：POST /api/appointments
 */
export function createAppointment(data: CreateAppointmentRequest): Promise<Appointment> {
  return request<Appointment>({
    url: '/api/appointments',
    method: 'POST',
    data,
  });
}

/* ===================== 订单 ===================== */

export interface Order {
  id: number;
  clientId: string;
  serviceName: string;
  staffName: string;
  amount: number;
  payMethod: 'cash' | 'wechat' | 'card';
  status: 'unpaid' | 'paid' | 'refunded';
  createdAt: string;
  remark?: string;
}

/**
 * 获取订单列表：GET /api/orders
 */
export function listOrders(): Promise<Order[]> {
  return request<Order[]>({
    url: '/api/orders',
    method: 'GET',
  });
}

/**
 * 获取订单详情：GET /api/orders/:id
 */
export function getOrder(id: number): Promise<Order> {
  return request<Order>({
    url: `/api/orders/${id}`,
    method: 'GET',
  });
}

/* ===================== 会员卡 ===================== */

export interface MemberCard {
  id: number;
  clientId: string;
  type: 'stored' | 'count'; // stored: 储值卡，count: 次卡
  name: string;
  balance?: number; // 储值卡余额
  remaining?: number; // 次卡剩余次数
  total?: number; // 次卡总次数
  status: 'active' | 'frozen' | 'expired';
  createdAt: string;
}

export interface RechargeRequest {
  amount: number;
}

/**
 * 获取会员卡列表：GET /api/member-cards?clientId=xxx
 */
export function listCards(clientId: string): Promise<MemberCard[]> {
  return request<MemberCard[]>({
    url: `/api/member-cards?clientId=${clientId}`,
    method: 'GET',
  });
}

/**
 * 获取会员卡详情：GET /api/member-cards/:id
 */
export function getCard(id: number): Promise<MemberCard> {
  return request<MemberCard>({
    url: `/api/member-cards/${id}`,
    method: 'GET',
  });
}

/**
 * 会员卡充值：POST /api/member-cards/:id/recharge
 */
export function rechargeCard(id: number, amount: number): Promise<MemberCard> {
  return request<MemberCard>({
    url: `/api/member-cards/${id}/recharge`,
    method: 'POST',
    data: { amount },
  });
}

/* ===================== 客户 ===================== */

export interface ClientUpdateRequest {
  name?: string;
  phone?: string;
  gender?: 'male' | 'female' | 'unknown';
  avatar?: string;
}

/**
 * 获取客户信息：GET /api/clients/:id
 */
export function getClient(id: string): Promise<ClientProfile> {
  return request<ClientProfile>({
    url: `/api/clients/${id}`,
    method: 'GET',
  });
}

/**
 * 更新客户信息：PUT /api/clients/:id
 */
export function updateClient(id: string, data: ClientUpdateRequest): Promise<ClientProfile> {
  return request<ClientProfile>({
    url: `/api/clients/${id}`,
    method: 'PUT',
    data,
  });
}
