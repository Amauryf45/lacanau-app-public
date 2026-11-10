import sharp from "sharp";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#59c2f7"/>
      <stop offset="0.62" stop-color="#bce7fd"/>
      <stop offset="0.62" stop-color="#33a5f0"/>
      <stop offset="0.78" stop-color="#1d87e4"/>
      <stop offset="0.78" stop-color="#f4dfb4"/>
      <stop offset="1" stop-color="#ecc884"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="110" fill="url(#sky)"/>
  <circle cx="380" cy="120" r="58" fill="#ffd166"/>
  <g transform="translate(150 210)">
    <line x1="40" y1="10" x2="40" y2="190" stroke="#8a5a2b" stroke-width="14" stroke-linecap="round"/>
    <path d="M-60 40 A115 115 0 0 1 140 40 L40 10 Z" fill="#f97316"/>
    <path d="M-60 40 A115 115 0 0 1 140 40" fill="none" stroke="#c2410c" stroke-width="6"/>
    <path d="M-25 22 L40 10 L20 55 Z" fill="#fb923c"/>
  </g>
  <path d="M0 400 Q 64 384 128 400 T 256 400 T 384 400 T 512 400 V 512 H 0 Z" fill="#1d87e4" opacity="0.35"/>
</svg>`;

const buf = Buffer.from(svg);
await sharp(buf).resize(512, 512).png().toFile("public/icon-512.png");
await sharp(buf).resize(192, 192).png().toFile("public/icon-192.png");
await sharp(buf).resize(180, 180).png().toFile("public/apple-touch-icon.png");
await sharp(buf).resize(32, 32).png().toFile("public/favicon.png");
console.log("icons OK");
