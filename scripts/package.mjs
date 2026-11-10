// Uses the machine-wide Electron / electron-builder caches so packaging works offline once warmed.
import { build } from "electron-builder";
process.env.CSC_IDENTITY_AUTO_DISCOVERY = "false";
await build();
