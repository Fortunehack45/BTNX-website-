const COLOR_MAP: Record<string, string> = {
  "dusty plum": "#735769",
  lavender: "#B3A6BE",
  slate: "#5A6065",
  "beige plaid": "#C9B9A0",
  "grey plaid": "#8E8D89",
  charcoal: "#333330",
  "deep navy": "#1E283A",
  "forest green": "#2A3E32",
  oatmeal: "#DED6C6",
  "sky / chalk / grey": "#9BB3C4",
  "sand / charcoal": "#C8BFA9",
  "ivory white": "#F4F0E8",
  burgundy: "#5C222A",
  "noir black": "#181817",
  "deep espresso": "#3B2820",
  oxblood: "#521E24",
  default: "#966830",
};

export function getSwatchHex(colorName: string): string {
  const key = colorName.trim().toLowerCase();
  return COLOR_MAP[key] || "#8A847B";
}
