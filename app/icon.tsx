import { ImageResponse } from "next/og";

// Browser-tab / PWA favicon. Simpler than the Home Screen icon so it stays
// legible at 32px: just the leaf silhouette + midrib on the green tile.
export const runtime = "nodejs";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

const leaf = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
    <path d='M50 8 C 22 30 22 66 50 92 C 78 66 78 30 50 8 Z' fill='#eef1e9'/>
    <path d='M50 26 L50 84' stroke='#2e7d53' stroke-width='7' stroke-linecap='round'/>
  </svg>`,
)}`;

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: "linear-gradient(145deg, #2e7d53, #216442)",
          borderRadius: 7,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={leaf} width={24} height={24} alt="" />
      </div>
    ),
    { ...size },
  );
}
