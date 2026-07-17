import { ImageResponse } from "next/og";

// Browser-tab / PWA favicon. Simpler than the Home Screen icon so it stays
// legible at 32px: a bolder 3-tine fork on the green tile.
export const runtime = "nodejs";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

const fork = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
    <g stroke='#eef1e9' stroke-width='8' stroke-linecap='round' fill='none'>
      <path d='M38 22 L38 46'/>
      <path d='M50 20 L50 46'/>
      <path d='M62 22 L62 46'/>
    </g>
    <rect x='34' y='44' width='32' height='11' rx='5.5' fill='#eef1e9'/>
    <path d='M50 53 L50 84' stroke='#eef1e9' stroke-width='12' stroke-linecap='round' fill='none'/>
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
        <img src={fork} width={24} height={24} alt="" />
      </div>
    ),
    { ...size },
  );
}
