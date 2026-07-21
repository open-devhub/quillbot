import {
  buildComponents,
  type TopLevelComponentInput,
} from "./buildComponents.ts";

interface BuildErrorProps {
  title: string;
  description?: string;
  color?: string | number;
}

export function buildErrorComponent({
  title,
  description = "",
  color = 0xd21872,
}: BuildErrorProps) {
  const components = [
    {
      type: "container",
      accentColor: color,
      components: [{ type: "text", content: "### " + title }],
    },
  ];
  description &&
    components[0]?.components.push({ type: "text", content: description });

  return buildComponents(components as TopLevelComponentInput[]);
}
