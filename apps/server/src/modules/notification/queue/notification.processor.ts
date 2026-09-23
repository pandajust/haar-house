import { Injectable, Logger } from '@nestjs/common';

/**
 * 通知任务：封装一次发送所需的最小信息。
 *
 * processor 会在异步上下文中执行此任务，调用 task.exec()。
 */
export interface NotificationTask {
  /** 任务来源（如 'notify' | 'notifyPhone' | 'notifyOpenid'）便于日志 */
  source: string;
  /** 真正执行发送的回调；processor 不关心其内部实现 */
  exec: () => Promise<void>;
}

/**
 * 简单内存队列 stub。
 *
 * M1 阶段不引入 BullMQ / Redis，使用 setImmediate 在下一个事件循环 tick
 * 执行任务。这样调用方 await notify() 立即返回，发送动作在后台异步进行。
 *
 * 设计：
 *  - enqueue 立即返回，任务进入微任务队列
 *  - 任务异常由 task.exec 内部 try/catch 兜底，processor 不再二次捕获
 *  - 暴露 drain() 给测试同步等待队列排空
 *  - 接口签名与未来 BullMQ 版本对齐，后续替换为 bullmq.Queue.add 即可
 *
 * 预留接口：可替换为 BullMQ Processor 的 process() 方法签名。
 */
@Injectable()
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  /** 待排空的任务计数，测试用 */
  private pending = 0;

  /** 排空时的 resolve 队列，drain() 等待 */
  private drainWaiters: Array<() => void> = [];

  /**
   * 入队任务并立即返回。
   * 任务在 setImmediate 中执行；失败仅记 warn。
   */
  enqueue(task: NotificationTask): void {
    this.pending += 1;
    setImmediate(() => {
      this.runTask(task).finally(() => {
        this.pending -= 1;
        if (this.pending === 0) {
          // 唤醒所有 drain 等待者
          const waiters = this.drainWaiters;
          this.drainWaiters = [];
          for (const resolve of waiters) resolve();
        }
      });
    });
  }

  /**
   * 测试辅助：等待队列内所有任务执行完毕。
   * 无任务时立即返回。
   */
  async drain(): Promise<void> {
    if (this.pending === 0) return;
    await new Promise<void>((resolve) => {
      this.drainWaiters.push(resolve);
    });
  }

  /**
   * 执行单个任务；exec 自身需负责 catch（不会向外冒泡），
   * 但这里再加一层兜底以防止未处理的 rejection 漏出影响 process。
   */
  private async runTask(task: NotificationTask): Promise<void> {
    try {
      await task.exec();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `异步通知任务执行失败 source=${task.source} err=${msg}`,
      );
    }
  }
}
