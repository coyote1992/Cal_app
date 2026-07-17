import { ImageResponse } from "next/og";

// iOS Home Screen icon (also the largest maskable icon). iOS applies its own
// rounded-corner mask, so this is a full-bleed square with no self-rounding.
// On-brand: a white herb leaf on the "fresh herb" green tile. Generated at
// build time via ImageResponse — no binary asset to keep in the repo.
export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const leaf = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
    <path d='M50 6 C 20 28 20 66 50 94 C 80 66 80 28 50 6 Z' fill='#eef1e9'/>
    <path d='M50 24 L50 86' stroke='#2e7d53' stroke-width='5' stroke-linecap='round'/>
    <path d='M50 42 L33 34' stroke='#2e7d53' stroke-width='4.5' stroke-linecap='round'/>
    <path d='M50 42 L67 34' stroke='#2e7d53' stroke-width='4.5' stroke-linecap='round'/>
    <path d='M50 60 L33 52' stroke='#2e7d53' stroke-width='4.5' stroke-linecap='round'/>
    <path d='M50 60 L67 52' stroke='#2e7d53' stroke-width='4.5' stroke-linecap='round'/>
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
        <img src={leaf} width={116} height={116} alt="" />
      </div>
    ),
    { ...size },
  );
}
