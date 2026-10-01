import { ImageResponse } from "next/og";

// Renders the app icon as a PNG at the requested size. The artwork keeps a
// generous safe zone so it also works as a maskable icon.
export function renderAppIcon(size: number): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#6F1A07",
        }}
      >
        <div
          style={{
            width: size * 0.52,
            height: size * 0.52,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: size * 0.08,
            border: `${Math.max(2, size * 0.035)}px solid #F7F3E3`,
            color: "#F7F3E3",
            fontSize: size * 0.24,
            fontWeight: 700,
            letterSpacing: -size * 0.01,
          }}
        >
          sE
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
