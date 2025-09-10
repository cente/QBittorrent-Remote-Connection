/**
 * Icon Generator for QBittorrent Extension
 * Creates simple SVG icons for different states
 */

// Generate a simple download icon SVG
function generateIcon(size, color = "#007bff", active = false) {
  const svg = `
        <svg width="${size}" height="${size}" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8" cy="8" r="7" fill="${color}" stroke="#fff" stroke-width="1"/>
            <path d="M8 3v6m-3-2l3 3 3-3" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            ${active ? '<circle cx="12" cy="4" r="2" fill="#00ff00"/>' : ""}
        </svg>
    `;

  return "data:image/svg+xml;base64," + btoa(svg);
}

// Normal state icons
const normalIcon16 = generateIcon(16);
const normalIcon32 = generateIcon(32);
const normalIcon48 = generateIcon(48);

// Active state icons (with green indicator)
const activeIcon16 = generateIcon(16, "#007bff", true);
const activeIcon32 = generateIcon(32, "#007bff", true);
const activeIcon48 = generateIcon(48, "#007bff", true);

// Export as data URLs
const icons = {
  normal: {
    16: normalIcon16,
    32: normalIcon32,
    48: normalIcon48,
  },
  active: {
    16: activeIcon16,
    32: activeIcon32,
    48: activeIcon48,
  },
};

console.log("Generated extension icons:", icons);
