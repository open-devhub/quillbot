import { createCanvas } from "@napi-rs/canvas";
import { AttachmentBuilder, Client, EmbedBuilder, Message } from "discord.js";

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);

  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function rgbToHsl(r: number, g: number, b: number) {
  ((r /= 255), (g /= 255), (b /= 255));

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s,
    l;

  l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }

    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToRgb(h: number, s: number, l: number) {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function parseColor(input: string): { r: number; g: number; b: number } {
  input = input.toLowerCase();

  let r = 0,
    g = 0,
    b = 0;

  if (/^#?[0-9a-f]{3,6}$/.test(input)) {
    let hex = input.replace("#", "");

    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((c: string) => c + c)
        .join("");
    }

    ({ r, g, b } = hexToRgb(hex));
  } else if (input.startsWith("rgb")) {
    const nums = input.match(/\d+/g);
    if (!nums || nums.length < 3) throw new Error();
    [r, g, b] = nums.map(Number) as [number, number, number];
  } else if (input.startsWith("hsl")) {
    const nums = input.match(/\d+/g);
    if (!nums || nums.length < 3) throw new Error();
    const [h, s, l] = nums.map(Number) as [number, number, number];
    ({ r, g, b } = hslToRgb(h, s, l));
  } else {
    throw new Error();
  }

  return { r, g, b };
}

export default {
  name: "color",
  description: "Preview a color or gradient",
  aliases: ["gradient"],
  callback: async (client: Client, message: Message, args: string[]) => {
    try {
      const inputs = args;

      if (!inputs.length) {
        return message.reply("Provide at least one color.");
      }

      if (inputs.length > 15) {
        return message.reply("Number of colors can't be greater than 15.");
      }

      const colors = inputs.map((c: string) => {
        const { r, g, b } = parseColor(c);
        return {
          r,
          g,
          b,
          hex: rgbToHex(r, g, b),
          hsl: rgbToHsl(r, g, b),
        };
      });

      const canvas = createCanvas(300, 150);
      const ctx = canvas.getContext("2d");

      if (colors.length === 1) {
        const c = colors[0]!;

        ctx.fillStyle = c.hex;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const brightness = (c.r * 299 + c.g * 587 + c.b * 114) / 1000;
        ctx.fillStyle = brightness > 128 ? "#000" : "#fff";

        ctx.font = "bold 18px Sans";
        ctx.textAlign = "center";

        ctx.fillText(c.hex.toUpperCase(), 150, 75);
      } else {
        const gradient = ctx.createLinearGradient(
          0,
          0,
          canvas.width,
          canvas.height,
        );

        const step = 1 / (colors.length - 1);

        colors.forEach((c, i) => {
          gradient.addColorStop(i * step, c.hex);
        });

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const buffer = canvas.toBuffer("image/png");

      const attachment = new AttachmentBuilder(buffer, {
        name: "color.png",
      });

      const embed = new EmbedBuilder()
        .setTitle(`🎨 ${colors.length === 1 ? "Color" : "Gradient"} Preview`)
        .setImage("attachment://color.png")
        .setColor(parseInt(colors[0]!.hex.replace("#", ""), 16));

      return message.reply({
        embeds: [embed],
        files: [attachment],
      });
    } catch (err) {
      return message.reply("Invalid color format.");
    }
  },
};
