-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('owner', 'manager', 'stylist', 'assistant', 'admin');

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "ClientGender" AS ENUM ('male', 'female', 'unknown');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('pending', 'confirmed', 'in_service', 'done', 'canceled', 'no_show');

-- CreateEnum
CREATE TYPE "AppointmentSource" AS ENUM ('mini', 'shop');

-- CreateEnum
CREATE TYPE "PayMethod" AS ENUM ('cash', 'wechat', 'card_balance', 'card_times', 'mixed');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('paid', 'refunded');

-- CreateEnum
CREATE TYPE "MemberCardType" AS ENUM ('stored_value', 'times', 'package');

-- CreateEnum
CREATE TYPE "MemberCardStatus" AS ENUM ('active', 'frozen', 'expired');

-- CreateEnum
CREATE TYPE "CardTransactionType" AS ENUM ('recharge', 'consume', 'refund', 'adjust');

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('discount', 'gift', 'rebate');

-- CreateTable
CREATE TABLE "shop" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "business_hours" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "shop_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "avatar" TEXT,
    "bio" TEXT,
    "commission_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "status" "StaffStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_schedule" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "staff_id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_time" time NOT NULL,
    "end_time" time NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,

    CONSTRAINT "staff_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "openid" TEXT NOT NULL,
    "phone" TEXT,
    "name" TEXT NOT NULL,
    "gender" "ClientGender" NOT NULL DEFAULT 'unknown',
    "tags" TEXT[],
    "note" TEXT,
    "last_visit_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "shop_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration_min" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "category" TEXT NOT NULL,
    "image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "client_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "start_time" TIMESTAMPTZ NOT NULL,
    "duration_min" INTEGER NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'pending',
    "source" "AppointmentSource" NOT NULL DEFAULT 'mini',
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "client_id" UUID,
    "staff_id" UUID NOT NULL,
    "items" JSONB NOT NULL,
    "pay_method" "PayMethod" NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'paid',
    "refund_amount" DECIMAL(10,2),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMPTZ,

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "order_id" UUID NOT NULL,
    "service_id" UUID,
    "staff_id" UUID NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "order_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_card" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "client_id" UUID NOT NULL,
    "type" "MemberCardType" NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "remaining_times" INTEGER,
    "bound_services" uuid[],
    "status" "MemberCardStatus" NOT NULL DEFAULT 'active',
    "issued_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expired_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "member_card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_transaction" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "card_id" UUID NOT NULL,
    "type" "CardTransactionType" NOT NULL,
    "delta" DECIMAL(10,2),
    "delta_times" INTEGER,
    "reason" TEXT NOT NULL,
    "ref_order_id" UUID,
    "balance_after" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CouponType" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "min_spend" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "valid_from" TIMESTAMPTZ NOT NULL,
    "valid_to" TIMESTAMPTZ NOT NULL,
    "total_count" INTEGER NOT NULL,
    "issued_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_shop_id_idx" ON "staff"("shop_id");

-- CreateIndex
CREATE INDEX "staff_schedule_staff_id_idx" ON "staff_schedule"("staff_id");

-- CreateIndex
CREATE UNIQUE INDEX "client_openid_key" ON "client"("openid");

-- CreateIndex
CREATE INDEX "client_phone_idx" ON "client"("phone");

-- CreateIndex
CREATE INDEX "service_shop_id_idx" ON "service"("shop_id");

-- CreateIndex
CREATE INDEX "appointment_client_id_idx" ON "appointment"("client_id");

-- CreateIndex
CREATE INDEX "appointment_service_id_idx" ON "appointment"("service_id");

-- CreateIndex
CREATE INDEX "appointment_start_time_idx" ON "appointment"("start_time");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_staff_id_start_time_key" ON "appointment"("staff_id", "start_time");

-- CreateIndex
CREATE INDEX "order_client_id_idx" ON "order"("client_id");

-- CreateIndex
CREATE INDEX "order_staff_id_idx" ON "order"("staff_id");

-- CreateIndex
CREATE INDEX "order_item_order_id_idx" ON "order_item"("order_id");

-- CreateIndex
CREATE INDEX "order_item_service_id_idx" ON "order_item"("service_id");

-- CreateIndex
CREATE INDEX "order_item_staff_id_idx" ON "order_item"("staff_id");

-- CreateIndex
CREATE INDEX "member_card_client_id_idx" ON "member_card"("client_id");

-- CreateIndex
CREATE INDEX "card_transaction_card_id_idx" ON "card_transaction"("card_id");

-- CreateIndex
CREATE INDEX "card_transaction_ref_order_id_idx" ON "card_transaction"("ref_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_code_key" ON "coupon"("code");

-- CreateIndex
CREATE INDEX "coupon_code_idx" ON "coupon"("code");

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_schedule" ADD CONSTRAINT "staff_schedule_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service" ADD CONSTRAINT "service_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_card" ADD CONSTRAINT "member_card_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_transaction" ADD CONSTRAINT "card_transaction_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "member_card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_transaction" ADD CONSTRAINT "card_transaction_ref_order_id_fkey" FOREIGN KEY ("ref_order_id") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

