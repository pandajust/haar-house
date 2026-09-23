-- AlterTable: staff 增加登录账号与密码哈希列
-- 用于管理后台账密登录（AuthModule）
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "username" TEXT NOT NULL DEFAULT '';
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "password_hash" TEXT NOT NULL DEFAULT '';

-- 唯一约束：登录账号不可重复
CREATE UNIQUE INDEX IF NOT EXISTS "staff_username_key" ON "staff"("username");
