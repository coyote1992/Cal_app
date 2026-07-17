import { ImageResponse } from "next/og";

// iOS Home Screen icon (also the largest maskable icon). iOS applies its own
// rounded-corner mask, so this is a full-bleed square with no self-rounding.
// On-brand: a white fork on the "fresh herb" green tile. Generated at build
// time via ImageResponse — no binary asset to keep in the repo.
export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const fork = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
    <g stroke='#eef1e9' stroke-width='5' stroke-linecap='round' fill='none'>
      <path d='M37 20 L37 45'/>
      <path d='M46 18 L46 45'/>
      <path d='M54 18 L54 45'/>
      <path d='M63 20 L63 45'/>
    </g>
    <rect x='34' y='43' width='32' height='10' rx='5' fill='#eef1e9'/>
    <path d='M50 51 L50 86' stroke='#eef1e9' stroke-width='9' stroke-linecap='round' fill='none'/>
  </svg>`,
)}`;

export default function AppleIcon() {
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
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fork} width={116} height={116} alt="" />
      </div>
    ),
    { ...size },
  );
}
