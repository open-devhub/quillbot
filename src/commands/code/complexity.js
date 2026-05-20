import { EmbedBuilder } from "discord.js";

export default {
  name: "complexity",
  description: "Estimate Big-O complexity of code",
  usage: "%pcomplexity\n<codeblock | message link>",
  aliases: ["bigo", "big-o", "algo"],

  callback: async (client, message, args) => {
    let code;

    const codeBlockMatch = message.content.match(
      /```([\w#+.-]+)\n([\s\S]*?)```/,
    );
    const linkMatch = args[0]?.match(
      /https:\/\/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/,
    );

    if (codeBlockMatch) {
      code = message.content.split("```").slice(1, -1).join("```");
    } else if (linkMatch) {
      const [_, guildId, channelId, messageId] = linkMatch;

      try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) throw new Error("Guild not found");

        const channel = guild.channels.cache.get(channelId);
        if (!channel?.isTextBased()) throw new Error("Channel not found");

        const fetchedMessage = await channel.messages.fetch(messageId);

        const fetchedCodeBlock = fetchedMessage.content.match(
          /```([\w#+.-]+)\n([\s\S]*?)```/,
        );

        if (!fetchedCodeBlock) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("❌ No code found to analyze!")
                .setColor(0xd21872),
            ],
          });
        }

        code = fetchedCodeBlock[2].trim();
      } catch (err) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Failed to fetch message")
              .setDescription(err.message)
              .setColor(0xd21872),
          ],
        });
      }
    }

    if (!code) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ No code found to analyze!")
            .setColor(0xd21872),
        ],
      });
    }

    const safe = (input, limit = 1000) => {
      if (typeof input !== "string") input = String(input);

      return input.length > limit
        ? input.slice(0, limit) + "\n... (truncated)"
        : input;
    };

    const codePreview = (input, limit = 180) => {
      const trimmed = input.trim();
      const lines = trimmed.split(/\r?\n/).slice(0, 3);
      const preview = lines.join(" ").replace(/\s+/g, " ").trim();
      return preview.length > limit ? preview.slice(0, limit) + "..." : preview;
    };

    const stripDecorators = (input) =>
      input
        .replace(/\/\/.*$/gm, "")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(["'`])(?:\\.|(?!\1).)*\1/g, "");

    try {
      if (!code?.trim()) {
        return message.reply(
          "Provide code in a codeblock.\nExample:\n```js\nfor(let i=0;i<n;i++){}\n```",
        );
      }

      const strippedCode = stripDecorators(code);
      const analysis = new Set();
      let score = 0;
      let loopDetected = false;
      let sortDetected = false;
      let recursionDetected = false;
      let exponentialRecursion = false;
      let tripleNested = false;
      let logarithmicPattern = false;
      let collectionIteration = false;

      const patterns = [
        {
          regex: /\b(?:for\s*\(|while\s*\(|do\s*\{)/g,
          value: 1,
          label: "Iterative loop detected",
          flag: () => (loopDetected = true),
        },
        {
          regex: /for\s*\([^)]*\)\s*\{[\s\S]*?for\s*\([^)]*\)\s*\{/g,
          value: 3,
          label: "Nested loops detected",
        },
        {
          regex: /for\s*\([^)]*\)\s*\{[\s\S]*?while\s*\(/g,
          value: 3,
          label: "Mixed nested iteration detected",
        },
        {
          regex:
            /for\s*\([^)]*\)\s*\{[\s\S]*?for\s*\([^)]*\)\s*\{[\s\S]*?for\s*\(/g,
          value: 4,
          label: "Triple nested loops detected",
          flag: () => (tripleNested = true),
        },
        {
          regex: /\.sort\s*\(/g,
          value: 2,
          label: "Sorting operation detected",
          flag: () => (sortDetected = true),
        },
        {
          regex:
            /(\/=|>>=|<<=|\*= *0\.5|Math\.log|Math\.sqrt|Math\.floor|\blog2\b|\blog10\b|n\s*\/\s*2)\b/g,
          value: 0.75,
          label: "Logarithmic pattern detected",
          flag: () => (logarithmicPattern = true),
        },
        {
          regex:
            /\b(?:map|filter|reduce|some|every|find|includes|forEach)\s*\(/g,
          value: 1,
          label: "Collection iteration helper detected",
          flag: () => (collectionIteration = true),
        },
      ];

      for (const pattern of patterns) {
        if (pattern.regex.test(strippedCode)) {
          analysis.add(pattern.label);
          score += pattern.value;
          if (pattern.flag) pattern.flag();
        }
      }

      const recursionPattern =
        /([a-zA-Z_$][\w$]*)\s*\([^)]*\)\s*\{([\s\S]*?)\}/g;
      for (const match of strippedCode.matchAll(recursionPattern)) {
        const functionName = match[1];
        const functionBody = match[2];
        const recursiveCalls = (
          functionBody.match(new RegExp(`\\b${functionName}\\s*\\(`, "g")) || []
        ).length;

        if (recursiveCalls >= 1) {
          recursionDetected = true;
          analysis.add("Recursive call pattern detected");
          score += 2;
        }

        if (recursiveCalls > 1) {
          exponentialRecursion = true;
          analysis.add("Multiple recursive calls detected");
          score += 3;
        }
      }

      if (analysis.size === 0) {
        analysis.add("No strong complexity indicators detected");
      }

      const complexity = (() => {
        if (exponentialRecursion) return "O(2ⁿ)";
        if (tripleNested) return "O(n³)";
        if (
          analysis.has("Nested loops detected") ||
          analysis.has("Mixed nested iteration detected")
        )
          return "O(n²)";
        if (sortDetected) return "O(n log n)";
        if (logarithmicPattern && !loopDetected && !recursionDetected)
          return "O(log n)";
        if (recursionDetected) return "O(n)";
        if (loopDetected || collectionIteration) return "O(n)";
        return "O(1)";
      })();

      const confidence = score >= 5 ? "High" : score >= 2 ? "Medium" : "Low";
      const reasoning = [];
      if (exponentialRecursion)
        reasoning.push(
          "Multiple recursive calls often indicate exponential growth.",
        );
      else if (tripleNested)
        reasoning.push("Triple nested loops strongly suggest cubic time.");
      else if (
        analysis.has("Nested loops detected") ||
        analysis.has("Mixed nested iteration detected")
      )
        reasoning.push("Nested iteration is the primary driver of complexity.");
      else if (sortDetected)
        reasoning.push("Sorting operations are typically O(n log n).");
      else if (logarithmicPattern)
        reasoning.push(
          "Logarithmic operations can indicate O(log n) behavior.",
        );
      else if (recursionDetected)
        reasoning.push(
          "Single recursive call patterns often map to linear recursion.",
        );
      else if (loopDetected || collectionIteration)
        reasoning.push("Linear iteration is the main complexity indicator.");
      else reasoning.push("No clear complexity-driving patterns found.");

      const embed = new EmbedBuilder()
        .setTitle("Big-O Complexity Estimation")
        .setColor(0x5865f2)
        .addFields(
          {
            name: "Estimated Complexity",
            value: `\`${complexity}\``,
            inline: true,
          },
          {
            name: "Confidence",
            value: confidence,
            inline: true,
          },
          {
            name: "Key Indicators",
            value: Array.from(analysis)
              .slice(0, 5)
              .map((x) => `• ${x}`)
              .join("\n"),
          },
          {
            name: "Reasoning",
            value: reasoning.join(" "),
          },
          {
            name: "Code Preview",
            value: `\`\`\`js\n${safe(codePreview(code), 200)}\n\`\`\``,
          },
        )
        .setFooter({
          text: "Quill Big-O Analyzer • heuristic estimation",
        });

      return message.reply({
        embeds: [embed],
      });
    } catch (err) {
      console.error(err);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Analysis failed")
            .setDescription(err.message)
            .setColor(0xd21872),
        ],
      });
    }
  },
};
