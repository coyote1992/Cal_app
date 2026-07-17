import type { MetadataRoute } from "next";

// Web app manifest. `display: standalone` makes the installed/home-screen
// app launch without browser chrome (address bar, toolbar) — belt-and-suspenders
// alongside the apple-mobile-web-app-capable meta tag in layout.tsx, and the
// primary signal for iOS 16.4+ and Android/Chrome.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Calorie Tracker",
    short_name: "Calories",
    description:
      "Track your daily calorie intake against a budget, with weekly and monthly stats.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#eef1e9",
    theme_color: "#eef1e9",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
