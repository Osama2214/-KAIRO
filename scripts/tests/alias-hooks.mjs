import { existsSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src");
function withExt(p) {
  for (const c of [p, `${p}.ts`, `${p}.tsx`, path.join(p, "index.ts")]) if (existsSync(c) && !c.endsWith(path.sep)) return c;
  return null;
}
export async function resolve(specifier, context, next) {
  if (specifier === "server-only") return { url: "data:text/javascript,export {}", shortCircuit: true };
  if (specifier.startsWith("@/")) {
    const file = withExt(path.join(root, specifier.slice(2)));
    if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
  }
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    const base = path.dirname(fileURLToPath(context.parentURL));
    const file = withExt(path.resolve(base, specifier));
    if (file && /\.(ts|tsx)$/.test(file)) return { url: pathToFileURL(file).href, shortCircuit: true };
  }
  return next(specifier, context);
}

// Transpile TypeScript with the project's compiler so type-only imports that
// lack the `type` keyword are elided (node's type stripping cannot do that).
import { readFile } from "node:fs/promises";
import ts from "typescript";
export async function load(url, context, next) {
  if (url.startsWith("file:") && /\.(ts|tsx|mts)$/.test(url)) {
    const source = await readFile(fileURLToPath(url), "utf8");
    const { outputText } = ts.transpileModule(source, {
      fileName: fileURLToPath(url),
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, verbatimModuleSyntax: false, isolatedModules: true },
    });
    return { format: "module", source: outputText, shortCircuit: true };
  }
  return next(url, context);
}
