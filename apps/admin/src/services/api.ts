/**
 * 管理后台 API 服务层
 * 使用 utils/request.ts 中的 axios 实例（已带 /api/v1 前缀 + token 拦截）
 */
import request from '@/utils/request';

/* ===================== 通用类型 ===================== */

export interface PageResult<T> {
  items?: T[];
  data?: T[];
  list?: T[];
  total?: number;
  page?: number;
  pageSize?: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  current?: number;
  size?: number;
}

/* ===================== Auth ===================== */

export interface UserInfo {
  id: string;
  username: string;
  role?: string;
  name?: string;
  phone?: string;
  [key: string]: unknown;
}

export interface LoginParams {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: UserInfo;
}

export const authApi = {
  login: (data: LoginParams) =>
    request.post<LoginResponse>('/auth/login', data).then((r) => r.data),
  refresh: (refreshToken: string) =>
    request
      .post<{ access_token: string; refresh_token: string }>('/auth/refresh', {
        refresh_token: refreshToken,
      })
      .then((r) => r.data),
  me: () => request.get<UserInfo>('/auth/me').then((r) => r.data),
};

/* ===================== Shop & Service ===================== */

export interface Shop {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface ServiceItem {
  id: string;
  shopId?: string;
  name: string;
  duration: number;
  price: number;
  category?: string;
  [key: string]: unknown;
}

export const shopApi = {
  listShops: (params?: PaginationParams) =>
    request.get<PageResult<Shop>>('/shops', { params }).then((r) => r.data),
  getShop: (id: string) => request.get<Shop>(`/shops/${id}`).then((r) => r.data),
  createShop: (data: Partial<Shop>) =>
    request.post<Shop>('/shops', data).then((r) => r.data),
  updateShop: (id: string, data: Partial<Shop>) =>
    request.put<Shop>(`/shops/${id}`, data).then((r) => r.data),
  deleteShop: (id: string) => request.delete(`/shops/${id}`).then((r) => r.data),

  listServices: (shopId: string, params?: PaginationParams) =>
    request.get<PageResult<ServiceItem>>(`/shops/${shopId}/services`, { params }).then((r) => r.data),
  createService: (shopId: string, data: Partial<ServiceItem>) =>
    request.post<ServiceItem>(`/shops/${shopId}/services`, data).then((r) => r.data),
  updateService: (id: string, data: Partial<ServiceItem>) =>
    request.put<ServiceItem>(`/services/${id}`, data).then((r) => r.data),
  deleteService: (id: string) =>
    request.delete(`/services/${id}`).then((r) => r.data),
};

/* ===================== Staff & Schedule ===================== */

export type StaffRole = 'owner' | 'manager' | 'barber' | 'staff';

export interface Staff {
  id: string;
  name: string;
  phone?: string;
  username?: string;
  role: StaffRole;
  commissionRate?: number;
  status?: 'active' | 'inactive';
  [key: string]: unknown;
}

export interface Schedule {
  id: string;
  staffId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  [key: string]: unknown;
}

export const staffApi = {
  listStaff: (params?: PaginationParams) =>
    request.get<PageResult<Staff>>('/staff', { params }).then((r) => r.data),
  getStaff: (id: string) => request.get<Staff>(`/staff/${id}`).then((r) => r.data),
  createStaff: (data: Partial<Staff> & { password?: string }) =>
    request.post<Staff>('/staff', data).then((r) => r.data),
  updateStaff: (id: string, data: Partial<Staff>) =>
    request.put<Staff>(`/staff/${id}`, data).then((r) => r.data),
  deleteStaff: (id: string) => request.delete(`/staff/${id}`).then((r) => r.data),

  listSchedules: (staffId: string) =>
    request.get<Schedule[]>(`/staff/${staffId}/schedules`).then((r) => r.data),
  createSchedule: (staffId: string, data: Omit<Schedule, 'id' | 'staffId'>) =>
    request
      .post<Schedule>(`/staff/${staffId}/schedules`, data)
      .then((r) => r.data),
  updateSchedule: (_staffId: string, id: string, data: Partial<Schedule>) =>
    request
      .put<Schedule>(`/schedules/${id}`, data)
      .then((r) => r.data),
  deleteSchedule: (_staffId: string, id: string) =>
    request.delete(`/schedules/${id}`).then((r) => r.data),
};

/* ===================== Client ===================== */

export type Gender = 'male' | 'female' | 'unknown';

export interface Client {
  id: string;
  name: string;
  phone: string;
  gender?: Gender;
  tags?: string[];
  note?: string;
  lastVisitAt?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export const clientApi = {
  listClients: (params?: PaginationParams & { keyword?: string }) =>
    request.get<PageResult<Client>>('/clients', { params }).then((r) => r.data),
  getClient: (id: string) =>
    request.get<Client>(`/clients/${id}`).then((r) => r.data),
  createClient: (data: Partial<Client>) =>
    request.post<Client>('/clients', data).then((r) => r.data),
  updateClient: (id: string, data: Partial<Client>) =>
    request.put<Client>(`/clients/${id}`, data).then((r) => r.data),
  deleteClient: (id: string) =>
    request.delete(`/clients/${id}`).then((r) => r.data),
};

/* ===================== Appointment ===================== */

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'in_service'
  | 'done'
  | 'canceled'
  | 'no_show';

export interface Appointment {
  id: string;
  clientId: string;
  clientName?: string;
  staffId: string;
  staffName?: string;
  serviceId?: string;
  serviceName?: string;
  startTime: string;
  endTime?: string;
  status: AppointmentStatus;
  remark?: string;
  [key: string]: unknown;
}

export interface Slot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export const appointmentApi = {
  listAppointments: (
    params?: PaginationParams & { status?: AppointmentStatus },
  ) =>
    request
      .get<PageResult<Appointment>>('/appointments', { params })
      .then((r) => r.data),
  getAppointment: (id: string) =>
    request.get<Appointment>(`/appointments/${id}`).then((r) => r.data),
  createAppointment: (data: Partial<Appointment>) =>
    request.post<Appointment>('/appointments', data).then((r) => r.data),
  updateAppointment: (id: string, data: Partial<Appointment>) =>
    request.put<Appointment>(`/appointments/${id}`, data).then((r) => r.data),
  cancelAppointment: (id: string) =>
    request.delete(`/appointments/${id}`).then((r) => r.data),
  updateStatus: (id: string, status: AppointmentStatus) =>
    request
      .patch<Appointment>(`/appointments/${id}/status`, { status })
      .then((r) => r.data),
  getSlots: (params: { staffId: string; date: string }) =>
    request.get<Slot[]>('/appointments/slots', { params }).then((r) => r.data),
};

/* ===================== Order ===================== */

export type PayMethod =
  | 'cash'
  | 'wechat'
  | 'card_balance'
  | 'card_times'
  | 'mixed';

export type OrderStatus = 'paid' | 'refunded' | 'pending';

export interface OrderItem {
  serviceId?: string;
  serviceName?: string;
  staffId?: string;
  staffName?: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  orderNo: string;
  clientId?: string;
  clientName?: string;
  staffId?: string;
  staffName?: string;
  items?: OrderItem[];
  amount: number;
  discount?: number;
  payMethod: PayMethod;
  status: OrderStatus;
  createdAt?: string;
  [key: string]: unknown;
}

export const orderApi = {
  listOrders: (params?: PaginationParams) =>
    request.get<PageResult<Order>>('/orders', { params }).then((r) => r.data),
  getOrder: (id: string) => request.get<Order>(`/orders/${id}`).then((r) => r.data),
  createOrder: (data: Partial<Order>) =>
    request.post<Order>('/orders', data).then((r) => r.data),
  refundOrder: (id: string) =>
    request.post<Order>(`/orders/${id}/refund`).then((r) => r.data),
};

/* ===================== Member Card ===================== */

export type CardType = 'balance' | 'times' | 'discount';

export interface MemberCard {
  id: string;
  clientId: string;
  clientName?: string;
  type: CardType;
  name: string;
  balance?: number;
  times?: number;
  discount?: number;
  [key: string]: unknown;
}

export interface CardTransaction {
  id: string;
  cardId: string;
  type: 'recharge' | 'consume' | 'refund';
  amount: number;
  createdAt?: string;
  [key: string]: unknown;
}

export const memberCardApi = {
  listCards: (params?: PaginationParams) =>
    request.get<PageResult<MemberCard>>('/member-cards', { params }).then((r) => r.data),
  getCard: (id: string) =>
    request.get<MemberCard>(`/member-cards/${id}`).then((r) => r.data),
  createCard: (data: Partial<MemberCard>) =>
    request.post<MemberCard>('/member-cards', data).then((r) => r.data),
  rechargeCard: (id: string, data: { amount: number }) =>
    request
      .post<MemberCard>(`/member-cards/${id}/recharge`, data)
      .then((r) => r.data),
  listTransactions: (cardId: string, params?: PaginationParams) =>
    request
      .get<PageResult<CardTransaction>>(`/member-cards/${cardId}/transactions`, {
        params,
      })
      .then((r) => r.data),
};