const LINK_REGEX = /https:\/\/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/;
const CODEBLOCK_REGEX = /```(?:([\w#+.-]*)\n)?([\s\S]*?)```/;

export function parseCodeBlock(content = "") {
  const match = content.match(CODEBLOCK_REGEX);
  if (!match) return null;

  return {
    lang: match[1]?.trim() || undefined,
    code: match[2].trim(),
  };
}

export function getLinkArg(args = []) {
  return args.find((arg) => typeof arg === "string" && LINK_REGEX.test(arg));
}

export function getCommandLang(args = []) {
  return args.find(
    (arg) => typeof arg === "string" && arg.length > 0 && !LINK_REGEX.test(arg),
  );
}

export function parseCodeCommandInput(content = "", args = []) {
  const codeBlock = parseCodeBlock(content);
  const link = getLinkArg(args);
  const langFromArgs = getCommandLang(args);

  return {
    codeBlock,
    link,
    langFromArgs,
  };
}
