// Ambient module manifest.
//
// Each individual file in this directory uses `declare module "bokken/<name>"`
// to attach typings to the engine-provided modules that scripts import at
// runtime. Triple-slash references here pull every module declaration into
// the program so they're all visible without per-file imports of this manifest.
//
// In practice, scripts import directly from the ambient module specifiers:
//
//   import Canvas from "bokken/canvas";
//   import { input } from "bokken/input";
//
// and the path mapping in tsconfig.json (`"bokken/*": ["./types/*.d.ts"]`)
// resolves them at type-check time.

/// <reference path="./audio.d.ts" />
/// <reference path="./canvas.d.ts" />
/// <reference path="./gameObject.d.ts" />
/// <reference path="./input.d.ts" />
/// <reference path="./log.d.ts" />
/// <reference path="./physics.d.ts" />
/// <reference path="./renderer.d.ts" />
/// <reference path="./scene.d.ts" />
/// <reference path="./window.d.ts" />
