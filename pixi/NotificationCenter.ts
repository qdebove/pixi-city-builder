import { GameNotification, NotificationAction, NotificationSeverity } from '@/types/ui';

interface NotificationTrigger {
  key: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  action?: NotificationAction;
  actionLabel?: string;
  ttlMs?: number;
  cooldownMs?: number;
}

export class NotificationCenter {
  private readonly defaultTtl = 6000;
  private readonly defaultCooldown = 12000;
  private readonly maxStack = 5;

  private notifications: GameNotification[] = [];
  private lastSeen = new Map<string, number>();

  public prune(nowMs: number) {
    this.notifications = this.notifications.filter((notif) => notif.expiresAt > nowMs);
  }

  public raise(trigger: NotificationTrigger, nowMs: number) {
    const lastAt = this.lastSeen.get(trigger.key);
    const cooldown = trigger.cooldownMs ?? this.defaultCooldown;
    if (lastAt !== undefined && nowMs - lastAt < cooldown) {
      return;
    }

    const createdAt = nowMs;
    const expiresAt = nowMs + (trigger.ttlMs ?? this.defaultTtl);

    const notification: GameNotification = {
      id: `${trigger.key}-${createdAt}`,
      title: trigger.title,
      message: trigger.message,
      severity: trigger.severity,
      createdAt,
      expiresAt,
      action: trigger.action,
      actionLabel: trigger.actionLabel,
    };

    this.notifications.push(notification);
    if (this.notifications.length > this.maxStack) {
      this.notifications = this.notifications.slice(-this.maxStack);
    }

    this.lastSeen.set(trigger.key, createdAt);
  }

  public dismiss(id: string) {
    this.notifications = this.notifications.filter((notif) => notif.id !== id);
  }

  public reset() {
    this.notifications = [];
    this.lastSeen.clear();
  }

  public snapshot(): GameNotification[] {
    return [...this.notifications].sort((a, b) => b.createdAt - a.createdAt);
  }
}
