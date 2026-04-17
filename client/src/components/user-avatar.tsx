import { useState } from "react";

interface UserAvatarProps {
  avatarUrl?: string | null;
  displayName?: string | null;
  size?: number;
  borderColor?: string;
  borderWidth?: number;
  fontSize?: number;
  className?: string;
  style?: React.CSSProperties;
  fill?: boolean;
  "data-testid"?: string;
}

function getInitials(displayName?: string | null): string {
  if (!displayName) return "?";
  return displayName
    .trim()
    .split(/\s+/)
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function getColorFromName(name?: string | null): string {
  const colors = [
    "#c0392b","#e67e22","#f39c12","#27ae60","#1abc9c",
    "#2980b9","#8e44ad","#d35400","#16a085","#2c3e50",
  ];
  if (!name) return colors[0];
  const idx = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  return colors[idx];
}

export function UserAvatar({
  avatarUrl,
  displayName,
  size = 40,
  borderColor,
  borderWidth = 0,
  fontSize,
  className,
  style,
  fill = false,
  "data-testid": testId,
}: UserAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const initials = getInitials(displayName);
  const bgColor = getColorFromName(displayName);
  const computedFontSize = fontSize ?? Math.max(8, Math.round((fill ? 40 : size) * 0.35));
  const showImage = !!avatarUrl && !imgFailed;

  if (fill) {
    return (
      <div
        className={className}
        data-testid={testId}
        style={{
          width: "100%",
          height: "100%",
          background: showImage ? "transparent" : bgColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...style,
        }}
      >
        {showImage ? (
          <img
            src={avatarUrl!}
            alt={displayName ?? ""}
            onError={() => setImgFailed(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <span style={{ fontSize: computedFontSize, fontWeight: 700, color: "#fff", lineHeight: 1, userSelect: "none" }}>
            {initials}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={className}
      data-testid={testId}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        border: borderWidth ? `${borderWidth}px solid ${borderColor ?? "rgba(255,255,255,0.2)"}` : undefined,
        background: showImage ? "transparent" : bgColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      {showImage ? (
        <img
          src={avatarUrl!}
          alt={displayName ?? ""}
          onError={() => setImgFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <span style={{ fontSize: computedFontSize, fontWeight: 700, color: "#fff", lineHeight: 1, userSelect: "none" }}>
          {initials}
        </span>
      )}
    </div>
  );
}
