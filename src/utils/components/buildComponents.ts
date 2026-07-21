import {
  ButtonStyle,
  ComponentType,
  SeparatorSpacingSize,
  type APIMessageComponentEmoji,
  type ChannelType,
} from "discord.js";

export type ButtonStyleName =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "link"
  | "premium"
  | ButtonStyle;

export type SeparatorSpacingName = "small" | "large" | SeparatorSpacingSize;

export interface EmojiInput {
  name: string;
  id?: string;
  animated?: boolean;
}

export interface MediaItemInput {
  url: string;
  description?: string;
  spoiler?: boolean;
}

interface BaseInput {
  id?: number;
}

export interface TextDisplayInput extends BaseInput {
  type: "text" | "textDisplay" | ComponentType.TextDisplay;
  content: string;
}

export interface SeparatorInput extends BaseInput {
  type: "separator" | ComponentType.Separator;
  divider?: boolean;
  spacing?: SeparatorSpacingName;
}

export interface ButtonInput extends BaseInput {
  type: "button" | ComponentType.Button;
  style?: ButtonStyleName;
  label?: string;
  emoji?: string | EmojiInput;
  customId?: string;
  url?: string;
  skuId?: string;
  disabled?: boolean;
}

export interface StringSelectInput extends BaseInput {
  type: "stringSelect" | "select" | ComponentType.StringSelect;
  customId: string;
  placeholder?: string;
  minValues?: number;
  maxValues?: number;
  disabled?: boolean;
  options: Array<{
    label: string;
    value: string;
    description?: string;
    emoji?: string | EmojiInput;
    default?: boolean;
  }>;
}

export interface UserSelectInput extends BaseInput {
  type: "userSelect" | ComponentType.UserSelect;
  customId: string;
  placeholder?: string;
  minValues?: number;
  maxValues?: number;
  disabled?: boolean;
  defaultValues?: Array<{ id: string; type: "user" }>;
}

export interface RoleSelectInput extends BaseInput {
  type: "roleSelect" | ComponentType.RoleSelect;
  customId: string;
  placeholder?: string;
  minValues?: number;
  maxValues?: number;
  disabled?: boolean;
  defaultValues?: Array<{ id: string; type: "role" }>;
}

export interface MentionableSelectInput extends BaseInput {
  type: "mentionableSelect" | ComponentType.MentionableSelect;
  customId: string;
  placeholder?: string;
  minValues?: number;
  maxValues?: number;
  disabled?: boolean;
  defaultValues?: Array<{ id: string; type: "user" | "role" }>;
}

export interface ChannelSelectInput extends BaseInput {
  type: "channelSelect" | ComponentType.ChannelSelect;
  customId: string;
  placeholder?: string;
  channelTypes?: ChannelType[];
  minValues?: number;
  maxValues?: number;
  disabled?: boolean;
  defaultValues?: Array<{ id: string; type: "channel" }>;
}

export interface ThumbnailInput extends BaseInput {
  type: "thumbnail" | ComponentType.Thumbnail;
  url: string;
  description?: string;
  spoiler?: boolean;
}

export interface SectionInput extends BaseInput {
  type: "section" | ComponentType.Section;

  components: TextDisplayInput[];

  accessory: ButtonInput | ThumbnailInput;
}

export interface MediaGalleryInput extends BaseInput {
  type: "mediaGallery" | "gallery" | ComponentType.MediaGallery;
  items: MediaItemInput[];
}

export interface FileInput extends BaseInput {
  type: "file" | ComponentType.File;
  url: string;
  spoiler?: boolean;
}

export interface ActionRowInput extends BaseInput {
  type: "actionRow" | "row" | ComponentType.ActionRow;
  components: Array<
    | ButtonInput
    | StringSelectInput
    | UserSelectInput
    | RoleSelectInput
    | MentionableSelectInput
    | ChannelSelectInput
  >;
}

export type ContainerChildInput =
  | ActionRowInput
  | SectionInput
  | TextDisplayInput
  | MediaGalleryInput
  | FileInput
  | SeparatorInput;

export interface ContainerInput extends BaseInput {
  type: "container" | ComponentType.Container;
  accentColor?: number | string;
  spoiler?: boolean;
  components: ContainerChildInput[];
}

export type TopLevelComponentInput =
  | ContainerInput
  | ActionRowInput
  | SectionInput
  | TextDisplayInput
  | MediaGalleryInput
  | FileInput
  | SeparatorInput;

const BUTTON_STYLE_MAP: Record<string, ButtonStyle> = {
  primary: ButtonStyle.Primary,
  secondary: ButtonStyle.Secondary,
  success: ButtonStyle.Success,
  danger: ButtonStyle.Danger,
  link: ButtonStyle.Link,
  premium: ButtonStyle.Premium,
};

function resolveButtonStyle(style?: ButtonStyleName): ButtonStyle {
  if (typeof style === "number") return style;
  return BUTTON_STYLE_MAP[style ?? "primary"] ?? ButtonStyle.Primary;
}

function resolveSpacing(spacing?: SeparatorSpacingName): SeparatorSpacingSize {
  if (spacing === "large" || spacing === SeparatorSpacingSize.Large) {
    return SeparatorSpacingSize.Large;
  }
  return SeparatorSpacingSize.Small;
}

function resolveEmoji(
  emoji?: string | EmojiInput,
): APIMessageComponentEmoji | undefined {
  if (!emoji) return undefined;

  if (typeof emoji === "string") {
    const match = emoji.match(/^<(a)?:(\w+):(\d+)>$/);
    if (match?.[2] && match[3]) {
      return {
        name: match[2],
        id: match[3],
        animated: Boolean(match[1]),
      };
    }
    return { name: emoji };
  }

  return emoji;
}

function resolveColor(color?: number | string): number | undefined {
  if (color === undefined) return undefined;
  if (typeof color === "number") return color;
  return parseInt(color.replace("#", ""), 16);
}

function media(url: string) {
  return { url };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[buildComponents] ${message}`);
  }
}

function isTextDisplay(c: any): c is TextDisplayInput {
  return (
    c?.type === "text" ||
    c?.type === "textDisplay" ||
    c?.type === ComponentType.TextDisplay
  );
}

function isButton(c: any): c is ButtonInput {
  return c?.type === "button" || c?.type === ComponentType.Button;
}

function isThumbnail(c: any): c is ThumbnailInput {
  return c?.type === "thumbnail" || c?.type === ComponentType.Thumbnail;
}

function buildOne(input: any, path = "components"): any {
  assert(input && typeof input === "object", `${path}: expected an object`);

  const base: Record<string, unknown> = {};
  if (input.id !== undefined) base.id = input.id;

  switch (input.type) {
    case "text":
    case "textDisplay":
    case ComponentType.TextDisplay:
      assert(
        typeof input.content === "string",
        `${path}: TextDisplay requires a string "content"`,
      );
      return {
        ...base,
        type: ComponentType.TextDisplay,
        content: input.content,
      };

    case "separator":
    case ComponentType.Separator:
      return {
        ...base,
        type: ComponentType.Separator,
        divider: input.divider ?? true,
        spacing: resolveSpacing(input.spacing),
      };

    case "button":
    case ComponentType.Button: {
      const style = resolveButtonStyle(input.style);
      const obj: any = {
        ...base,
        type: ComponentType.Button,
        style,
        disabled: input.disabled ?? false,
      };

      if (input.label) obj.label = input.label;
      if (input.emoji) obj.emoji = resolveEmoji(input.emoji);

      if (style === ButtonStyle.Link) {
        assert(input.url, `${path}: Link buttons require a "url"`);
        obj.url = input.url;
      } else if (style === ButtonStyle.Premium) {
        assert(input.skuId, `${path}: Premium buttons require a "skuId"`);
        obj.sku_id = input.skuId;
      } else {
        assert(
          input.customId,
          `${path}: Non-link/premium buttons require a "customId"`,
        );
        obj.custom_id = input.customId;
      }

      return obj;
    }

    case "actionRow":
    case "row":
    case ComponentType.ActionRow: {
      assert(
        Array.isArray(input.components) && input.components.length > 0,
        `${path}: ActionRow requires a non-empty "components" array`,
      );
      assert(
        input.components.length <= 5,
        `${path}: ActionRow can have at most 5 components`,
      );

      const hasSelect = input.components.some((c: any) =>
        [
          "stringSelect",
          "select",
          "userSelect",
          "roleSelect",
          "mentionableSelect",
          "channelSelect",
          ComponentType.StringSelect,
          ComponentType.UserSelect,
          ComponentType.RoleSelect,
          ComponentType.MentionableSelect,
          ComponentType.ChannelSelect,
        ].includes(c.type),
      );

      if (hasSelect) {
        assert(
          input.components.length === 1,
          `${path}: ActionRow can only contain a single Select menu (no buttons mixed with it)`,
        );
      }

      return {
        ...base,
        type: ComponentType.ActionRow,
        components: input.components.map((c: any, i: number) =>
          buildOne(c, `${path}.components[${i}]`),
        ),
      };
    }

    case "stringSelect":
    case "select":
    case ComponentType.StringSelect: {
      assert(input.customId, `${path}: StringSelect requires "customId"`);
      assert(
        Array.isArray(input.options) && input.options.length > 0,
        `${path}: StringSelect requires a non-empty "options" array`,
      );
      assert(
        input.options.length <= 25,
        `${path}: StringSelect can have at most 25 options`,
      );

      return {
        ...base,
        type: ComponentType.StringSelect,
        custom_id: input.customId,
        placeholder: input.placeholder,
        min_values: input.minValues,
        max_values: input.maxValues,
        disabled: input.disabled ?? false,
        options: input.options.map((o: any) => ({
          label: o.label,
          value: o.value,
          description: o.description,
          emoji: resolveEmoji(o.emoji),
          default: o.default,
        })),
      };
    }

    case "userSelect":
    case ComponentType.UserSelect:
    case "roleSelect":
    case ComponentType.RoleSelect:
    case "mentionableSelect":
    case ComponentType.MentionableSelect:
    case "channelSelect":
    case ComponentType.ChannelSelect: {
      const typeMap: Record<string | number, ComponentType> = {
        userSelect: ComponentType.UserSelect,
        [ComponentType.UserSelect]: ComponentType.UserSelect,
        roleSelect: ComponentType.RoleSelect,
        [ComponentType.RoleSelect]: ComponentType.RoleSelect,
        mentionableSelect: ComponentType.MentionableSelect,
        [ComponentType.MentionableSelect]: ComponentType.MentionableSelect,
        channelSelect: ComponentType.ChannelSelect,
        [ComponentType.ChannelSelect]: ComponentType.ChannelSelect,
      };

      assert(input.customId, `${path}: Select requires "customId"`);

      const obj: any = {
        ...base,
        type: typeMap[input.type],
        custom_id: input.customId,
        placeholder: input.placeholder,
        min_values: input.minValues,
        max_values: input.maxValues,
        disabled: input.disabled ?? false,
      };

      if (input.defaultValues) obj.default_values = input.defaultValues;
      if (
        (input.type === "channelSelect" ||
          input.type === ComponentType.ChannelSelect) &&
        input.channelTypes
      ) {
        obj.channel_types = input.channelTypes;
      }

      return obj;
    }

    case "section":
    case ComponentType.Section: {
      assert(
        Array.isArray(input.components) && input.components.length >= 1,
        `${path}: Section requires 1–3 TextDisplay components`,
      );
      assert(
        input.components.length <= 3,
        `${path}: Section can have at most 3 TextDisplay components`,
      );

      for (let i = 0; i < input.components.length; i++) {
        assert(
          isTextDisplay(input.components[i]),
          `${path}.components[${i}]: Section children must be TextDisplay components only`,
        );
      }

      assert(
        input.accessory,
        `${path}: Section requires an "accessory" (Button or Thumbnail)`,
      );
      assert(
        isButton(input.accessory) || isThumbnail(input.accessory),
        `${path}.accessory: must be a Button or Thumbnail`,
      );

      return {
        ...base,
        type: ComponentType.Section,
        components: input.components.map((c: any, i: number) =>
          buildOne(c, `${path}.components[${i}]`),
        ),
        accessory: buildOne(input.accessory, `${path}.accessory`),
      };
    }

    case "thumbnail":
    case ComponentType.Thumbnail:
      assert(input.url, `${path}: Thumbnail requires a "url"`);
      return {
        ...base,
        type: ComponentType.Thumbnail,
        media: media(input.url),
        description: input.description,
        spoiler: input.spoiler ?? false,
      };

    case "mediaGallery":
    case "gallery":
    case ComponentType.MediaGallery: {
      assert(
        Array.isArray(input.items) && input.items.length >= 1,
        `${path}: MediaGallery requires 1–10 items`,
      );
      assert(
        input.items.length <= 10,
        `${path}: MediaGallery can have at most 10 items`,
      );

      return {
        ...base,
        type: ComponentType.MediaGallery,
        items: input.items.map((item: MediaItemInput) => ({
          media: media(item.url),
          description: item.description,
          spoiler: item.spoiler ?? false,
        })),
      };
    }

    case "file":
    case ComponentType.File:
      assert(input.url, `${path}: File requires a "url" (attachment://...)`);
      assert(
        input.url.startsWith("attachment://"),
        `${path}: File url must start with "attachment://"`,
      );
      return {
        ...base,
        type: ComponentType.File,
        file: media(input.url),
        spoiler: input.spoiler ?? false,
      };

    case "container":
    case ComponentType.Container: {
      assert(
        Array.isArray(input.components),
        `${path}: Container requires a "components" array`,
      );

      const allowed = new Set([
        "actionRow",
        "row",
        "section",
        "text",
        "textDisplay",
        "mediaGallery",
        "gallery",
        "file",
        "separator",
        ComponentType.ActionRow,
        ComponentType.Section,
        ComponentType.TextDisplay,
        ComponentType.MediaGallery,
        ComponentType.File,
        ComponentType.Separator,
      ]);

      for (let i = 0; i < input.components.length; i++) {
        const child = input.components[i];
        assert(
          allowed.has(child?.type),
          `${path}.components[${i}]: Invalid child type "${child?.type}". ` +
            `Container only allows: ActionRow, Section, TextDisplay, MediaGallery, File, Separator.\n` +
            `Tip: Thumbnail can only be used as the accessory of a Section.`,
        );
      }

      return {
        ...base,
        type: ComponentType.Container,
        accent_color: resolveColor(input.accentColor),
        spoiler: input.spoiler ?? false,
        components: input.components.map((c: any, i: number) =>
          buildOne(c, `${path}.components[${i}]`),
        ),
      };
    }

    default:
      throw new Error(
        `${path}: Unknown component type "${(input as any).type}"`,
      );
  }
}

export function buildComponents(inputs: TopLevelComponentInput[]): any[] {
  assert(Array.isArray(inputs), "buildComponents expects an array");

  const topLevelAllowed = new Set([
    "container",
    "actionRow",
    "row",
    "section",
    "text",
    "textDisplay",
    "mediaGallery",
    "gallery",
    "file",
    "separator",
    ComponentType.Container,
    ComponentType.ActionRow,
    ComponentType.Section,
    ComponentType.TextDisplay,
    ComponentType.MediaGallery,
    ComponentType.File,
    ComponentType.Separator,
  ]);

  for (let i = 0; i < inputs.length; i++) {
    const c = inputs[i] as any;
    assert(
      topLevelAllowed.has(c?.type),
      `components[${i}]: Invalid top-level type "${c?.type}". ` +
        `Allowed: Container, ActionRow, Section, TextDisplay, MediaGallery, File, Separator.\n` +
        `Tip: Thumbnail can only be used as the accessory of a Section. Buttons must be inside an ActionRow or Section accessory.`,
    );
  }

  return inputs.map((c, i) => buildOne(c, `components[${i}]`));
}
