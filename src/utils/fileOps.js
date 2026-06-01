import fsp from "fs/promises";

export function readFile(path) {
  return fsp.readFile(path, "utf-8");
}

export function writeFile(path, content) {
  return fsp.writeFile(path, content, "utf-8");
}
