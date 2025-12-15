import React, { useMemo, useState } from 'react';

interface InfoImageSlotProps {
  label: string;
  imageUrl?: string;
  locked?: boolean;
  lockReason?: string;
  accentColor?: string;
  fallbackContent?: React.ReactNode;
  showPreviewOnHover?: boolean;
}

const buildGradient = (accentColor?: string) => {
  const base = accentColor ?? '#0ea5e9';
  return {
    backgroundImage: `linear-gradient(135deg, ${base} 0%, #0f172a 80%)`,
  } as const;
};

export const InfoImageSlot: React.FC<InfoImageSlotProps> = ({
  label,
  imageUrl,
  locked = false,
  lockReason,
  accentColor,
  fallbackContent,
  showPreviewOnHover = false,
}) => {
  const fallback = fallbackContent ?? (
    <span className="text-xl font-black uppercase text-white/80">
      {label.slice(0, 2)}
    </span>
  );

  const [isHovered, setIsHovered] = useState(false);
  const shouldPreview = showPreviewOnHover && imageUrl && !locked;
  const previewStyle = useMemo(
    () =>
      imageUrl
        ? { backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : buildGradient(accentColor),
    [accentColor, imageUrl]
  );

  return (
    <div
      className="relative h-24 w-24 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-inner"
      onMouseEnter={() => shouldPreview && setIsHovered(true)}
      onMouseLeave={() => shouldPreview && setIsHovered(false)}
    >
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={imageUrl ? { backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : buildGradient(accentColor)}
      >
        {!imageUrl && fallback}
      </div>

      {locked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-slate-900/60 text-center backdrop-blur-sm">
          <span className="rounded-full bg-amber-900/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-100">
            Non débloqué
          </span>
          {lockReason && (
            <span className="text-[11px] text-slate-100 leading-tight">
              {lockReason}
            </span>
          )}
        </div>
      )}

      {locked && (
        <div className="absolute inset-0 bg-slate-950/30" />
      )}

      {shouldPreview && isHovered && (
        <div className="absolute left-full top-0 z-10 ml-3 hidden h-28 w-36 overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900/90 shadow-xl sm:block">
          <div className="absolute inset-0 opacity-90" style={previewStyle} />
          <div className="relative flex h-full items-end justify-start bg-gradient-to-t from-slate-950/60 to-transparent p-2 text-[11px] text-white">
            <span className="rounded-full bg-slate-900/70 px-2 py-0.5 font-semibold">Aperçu</span>
          </div>
        </div>
      )}
    </div>
  );
};
