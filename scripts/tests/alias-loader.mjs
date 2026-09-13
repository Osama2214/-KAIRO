// Resolves the app's "@/..." alias and extension-less imports so server
// modules can be exercised directly with node --experimental-strip-types.
import { register } from "node:module";
register("./alias-hooks.mjs", import.meta.url);
