import React from 'react';
import { GameNotification } from '@/types/ui';

interface Props {
  notifications: GameNotification[];
  onAction?: (notification: GameNotification) => void;
  onDismiss?: (id: string) => void;
}

const severityChrome: Record<GameNotification['severity'], string> = {
  info: 'border-sky-500/70 bg-sky-900/80 text-sky-100',
  warning: 'border-amber-500/70 bg-amber-900/80 text-amber-50',
  critical: 'border-rose-500/70 bg-rose-900/80 text-rose-50',
};

const severityPill: Record<GameNotification['severity'], string> = {
  info: 'bg-sky-500/80 text-sky-50',
  warning: 'bg-amber-500/90 text-amber-50',
  critical: 'bg-rose-600/90 text-rose-50',
};

export const NotificationCenter: React.FC<Props> = ({
  notifications,
  onAction,
  onDismiss,
}) => {
  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-[92px] z-50 flex w-[360px] max-w-full flex-col gap-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`pointer-events-auto overflow-hidden rounded-xl border px-3 py-2 shadow-2xl backdrop-blur ${severityChrome[notification.severity]}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-white">
                  {notification.title}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${severityPill[notification.severity]}`}
                >
                  {notification.severity === 'critical'
                    ? 'Critique'
                    : notification.severity === 'warning'
                      ? 'Alerte'
                      : 'Info'}
                </span>
              </div>
              <p className="text-[12px] leading-snug text-white/90">{notification.message}</p>
            </div>
            <div className="flex items-center gap-2">
              {notification.action && (
                <button
                  type="button"
                  onClick={() => onAction?.(notification)}
                  className="rounded-md bg-white/10 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-white/20"
                >
                  {notification.actionLabel ?? 'Voir'}
                </button>
              )}
              <button
                type="button"
                aria-label="Fermer la notification"
                onClick={() => onDismiss?.(notification.id)}
                className="rounded-full bg-white/10 px-2 py-1 text-[12px] text-white transition hover:bg-white/20"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
