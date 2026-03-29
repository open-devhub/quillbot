import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

/**
 * Build a Modal from a config object.
 * config: {
 *  customId: string,
 *  title: string,
 *  fields: [{ customId, label, style, placeholder, required, maxLength, minLength }]
 * }
 */
export default (client, config = {}) => {
  const modal = new ModalBuilder()
    .setCustomId(config.customId || "modal")
    .setTitle(config.title || "Modal");

  const fields = config.fields || [];

  const components = fields.map((f) => {
    const input = new TextInputBuilder()
      .setCustomId(f.customId)
      .setLabel(f.label || f.customId)
      .setStyle(
        f.style === "PARAGRAPH"
          ? TextInputStyle.Paragraph
          : TextInputStyle.Short,
      )
      .setRequired(f.required ?? true);

    if (f.placeholder) input.setPlaceholder(f.placeholder);
    if (typeof f.maxLength === "number") input.setMaxLength(f.maxLength);
    if (typeof f.minLength === "number") input.setMinLength(f.minLength);

    return new ActionRowBuilder().addComponents(input);
  });

  if (components.length) modal.setComponents(...components);

  return modal;
};
