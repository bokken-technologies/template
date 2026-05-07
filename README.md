# Template

A starter project for the [Bokken](https://github.com/bokken-technologies/bokken) 2D game engine.

The engine itself is pulled in at configure time via CMake's `FetchContent`,
so there is no separate engine checkout to manage. The first `make build`
clones it; subsequent builds reuse the cached source tree.

## Prerequisites

- **CMake** 3.16 or newer
- **A C++20 compiler** — Clang 14+, GCC 11+, MSVC 19.30+
- **Node.js** with `npx` available, for transpiling TypeScript scripts to JS
- **Python 3** with `jinja2` (`pip3 install --user jinja2`) — required by
  the engine's bundled OpenGL loader generator
- **Git** — for the `FetchContent` clone of the engine on first configure

## Layout

```
.
├── src/                     # Game code (TypeScript / JSX)
├── types/                   # Type definitions for the engine's JS modules
├── assets/                  # Static assets — packed by the build into .assetpack files
│   ├── audio/
│   ├── fonts/
│   ├── models/
│   ├── scenes/
│   ├── sprites/
│   └── textures/
├── darwin/main.cpp          # macOS entry point
├── linux/main.cpp           # Linux entry point
├── windows/main.cpp         # Windows entry point
├── project.bokken           # Runtime configuration (window, scripting runtime, environments)
├── tsconfig.json            # TypeScript compiler config
├── CMakeLists.txt           # Build description (fetches the engine)
└── Makefile                 # Convenience wrapper around the CMake invocation
```

## Build & run

```bash
# Compile TypeScript, configure CMake (fetches the engine on first run),
# build the executable, pack assets, deploy the engine library next to it.
make build
```

```bash
# Build, then launch.
make run
```

```bash
# Remove all build artifacts (does not remove the FetchContent cache —
# delete _deps/ inside the build dir if you want to force a fresh engine clone).
make clean
```

```bash
# Compile TypeScript only.
make typescript
```

```bash
# Run CMake configure only (also runs typescript first, since the configure
# step needs the transpiled JS directory to exist).
make setup
```

## Pinning the engine version

The Makefile defaults to tracking the engine's `master` branch. To pin
a specific git ref (tag, branch, or commit SHA), pass `BOKKEN_ENGINE_TAG`:

```bash
make build BOKKEN_ENGINE_TAG=v1.2.3
```

When invoking CMake directly:

```bash
cmake -S . -B build/<platform> -DSCRIPTS_DIR=... -DBOKKEN_ENGINE_TAG=v1.2.3
```

The default of `master` makes for fast iteration during early development
but is not what you want for reproducible builds — pin a release tag once
your project depends on a stable surface.
