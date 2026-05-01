import { createCanvas } from "@napi-rs/canvas";
import { AttachmentBuilder, EmbedBuilder } from "discord.js";
import getConfig from "../../utils/getConfig.js";

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);

  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function rgbToHsl(r, g, b) {
  ((r /= 255), (g /= 255), (b /= 255));

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l;

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

function hslToRgb(h, s, l) {
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

export default {
  name: "color",
  description: "Preview a color",
  callback: async (client, message, args) => {
    const { emojis } = await getConfig();
    const { check } = emojis;

    try {
      const input = args.join(" ").toLowerCase();

      let r, g, b;

      // hex
      if (/^#?[0-9a-f]{3,6}$/.test(input)) {
        let hex = input.replace("#", "");

        if (hex.length === 3) {
          hex = hex
            .split("")
            .map((c) => c + c)
            .join("");
        }

        ({ r, g, b } = hexToRgb(hex));
      }

      // RGB
      else if (input.startsWith("rgb")) {
        const nums = input.match(/\d+/g);
        if (!nums || nums.length < 3) throw new Error();

        [r, g, b] = nums.map(Number);
      }

      // HSL
      else if (input.startsWith("hsl")) {
        const nums = input.match(/\d+/g);
        if (!nums || nums.length < 3) throw new Error();

        const [h, s, l] = nums.map(Number);
        ({ r, g, b } = hslToRgb(h, s, l));
      } else {
        throw new Error();
      }

      const hex = rgbToHex(r, g, b);
      const hsl = rgbToHsl(r, g, b);

      // smol canvas
      const canvas = createCanvas(300, 150);
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = hex;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // contrast
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      ctx.fillStyle = brightness > 128 ? "#000" : "#fff";

      ctx.font = "bold 22px Sans";
      ctx.textAlign = "center";

      ctx.fillText(hex.toUpperCase(), 150, 65);

      ctx.font = "16px Sans";
      ctx.fillText(`RGB(${r}, ${g}, ${b})`, 150, 95);
      ctx.fillText(`HSL(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, 150, 120);

      const buffer = canvas.toBuffer("image/png");

      const attachment = new AttachmentBuilder(buffer, {
        name: "color.png",
      });

      const embed = new EmbedBuilder()
        .setTitle(`🎨 Color Preview`)
        // .setDescription(
        //   `HEX: \`${hex}\`\nRGB: \`${r}, ${g}, ${b}\`\nHSL: \`${hsl.h}, ${hsl.s}%, ${hsl.l}%\``,
        // )
        .setImage("attachment://color.png")
        .setColor(parseInt(hex.replace("#", ""), 16));

      return message.reply({
        embeds: [embed],
        files: [attachment],
      });
    } catch (err) {
      return message.reply("Invalid color format.");
    }
  },
};
