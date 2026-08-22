/**
 * Build-time OG image generator.
 *
 * Renders a branded 1200x630 social preview PNG from a small config file
 * (og.config.json in the project root, optional) and writes it to public/og.png.
 * Runs locally at build time via `npm run gen:og` — satori + @resvg/resvg-js
 * never run inside the Worker, keeping the runtime bundle small and free-tier
 * CPU-safe.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const FONT_PATH = path.join(__dirname, "fonts", "Inter-Bold.ttf");
const CONFIG_PATH = path.join(root, "og.config.json");
const OUT_PATH = path.join(root, "public", "og.png");

const defaults = {
  orgName: "My Links",
  tagline: "Check out my links",
  accent: "#6366f1",
};

let config = defaults;
if (existsSync(CONFIG_PATH)) {
  config = { ...defaults, ...JSON.parse(await readFile(CONFIG_PATH, "utf8")) };
}

const fontData = await readFile(FONT_PATH);

const svg = await satori(
  {
    type: "div",
    props: {
      style: {
        width: "1200px",
        height: "630px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px",
        background: "#fafafa",
        fontFamily: "Inter",
        color: "#18181b",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              fontSize: "28px",
              fontWeight: 700,
              color: config.accent,
              textTransform: "uppercase",
              letterSpacing: "2px",
              marginBottom: "20px",
            },
            children: [config.orgName],
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              fontSize: "72px",
              fontWeight: 800,
              lineHeight: 1.1,
              marginBottom: "28px",
            },
            children: [config.tagline],
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              width: "120px",
              height: "12px",
              borderRadius: "6px",
              background: config.accent,
            },
            children: [],
          },
        },
      ],
    },
  },
  {
    width: 1200,
    height: 630,
    fonts: [{ name: "Inter", data: fontData, weight: 700, style: "normal" }],
  },
);

const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
const png = resvg.render().asPng();

await mkdir(path.dirname(OUT_PATH), { recursive: true });
await writeFile(OUT_PATH, png);
console.log(`og.png written (${png.length} bytes) — ${config.orgName}`);