import { build } from "electron-builder";
import path from "node:path";
process.env.ELECTRON_CACHE = path.resolve(".electron-cache");
process.env.ELECTRON_BUILDER_CACHE = path.resolve(".builder-cache");
process.env.CSC_IDENTITY_AUTO_DISCOVERY = "false";
await build();
