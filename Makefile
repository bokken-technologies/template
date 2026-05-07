APP_NAME = Template

# OS & Paths
ifeq ($(OS),Windows_NT)
    PLATFORM_DIR = windows
    P_SEP = \\
    CLEAN_CMD = rmdir /s /q build 2>nul || exit 0
else
    PLATFORM_DIR = $(shell uname -s | tr '[:upper:]' '[:lower:]')
    P_SEP = /
    CLEAN_CMD = rm -rf build
endif

BUILD_TEMP   = build$(P_SEP)$(PLATFORM_DIR)
SCRIPTS_OUT  = $(BUILD_TEMP)$(P_SEP)transpiled
CMAKE_CACHE  = $(BUILD_TEMP)$(P_SEP)CMakeCache.txt
TS_STAMP     = $(BUILD_TEMP)$(P_SEP).tsc.stamp
BIN          = $(BUILD_TEMP)$(P_SEP)bin$(P_SEP)$(APP_NAME)

# TypeScript inputs — captured at parse time. Adding a brand-new .ts
# file requires a second `make` invocation to register, since `find`
# runs before the new file lands on disk on the first one.
TS_SOURCES = $(shell find src types -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.d.ts' \) 2>/dev/null) tsconfig.json

# Optional: pin the engine to a specific git ref.
#   make build BOKKEN_ENGINE_TAG=v1.2.3
BOKKEN_ENGINE_TAG ?= master

# Default
all: build

# File-backed targets (incremental)
#
# These exist as actual files on disk. Make compares timestamps and
# skips the recipe when the target is newer than its prerequisites —
# which is what makes a no-op `make run` actually no-op.

# CMake configure runs ONCE, when CMakeCache.txt doesn't exist yet
# (or after `make clean`). Subsequent invocations are skipped because
# Make sees the cache file is present and the dependency is satisfied.
# CMake's own auto-regen handles re-configures when CMakeLists.txt
# itself changes — that happens during `cmake --build`, not here.
#
# IMPORTANT: this target depends ONLY on the existence of $(SCRIPTS_OUT)
# as a directory (order-only prerequisite, after the |), NOT on the tsc
# stamp. The cmake configure step doesn't read transpiled JS — it just
# needs the path to exist. Depending on $(TS_STAMP) here would mean every
# tsc rerun (i.e. every .tsx edit) invalidates the cmake cache and triggers
# a full reconfigure, cascading into rebuilds of the engine and everything
# downstream.
$(CMAKE_CACHE): | $(SCRIPTS_OUT)
	cmake -S . -B $(BUILD_TEMP) -DCMAKE_BUILD_TYPE=Debug \
	    -DSCRIPTS_DIR="$(abspath $(SCRIPTS_OUT))" \
	    -DBOKKEN_ENGINE_TAG="$(BOKKEN_ENGINE_TAG)"

# Order-only prerequisite: the directory has to exist before configure
# runs, but its mtime doesn't propagate up — files landing inside don't
# make $(CMAKE_CACHE) appear stale.
$(SCRIPTS_OUT):
	@mkdir -p $(SCRIPTS_OUT)

# tsc re-runs only when a .ts/.tsx/.d.ts file or tsconfig.json is
# newer than the stamp. The stamp is touched after a successful tsc,
# giving us a single mtime to compare against.
$(TS_STAMP): $(TS_SOURCES) | $(SCRIPTS_OUT)
	@echo "Compiling TypeScript..."
	npx tsc --project tsconfig.json --outDir $(SCRIPTS_OUT)
	@touch $(TS_STAMP)

# Phony entry points
#
# Thin wrappers around the file-backed targets. `build` triggers tsc and
# the cmake configure independently — neither depends on the other through
# the Make graph. cmake --build at the end picks up whatever tsc produced
# via the OUTPUT-driven custom commands inside CMakeLists.txt.
build: $(TS_STAMP) $(CMAKE_CACHE)
	cmake --build $(BUILD_TEMP)
	@echo "Build complete. Executable & assets deployed to $(BUILD_TEMP)$(P_SEP)bin."

# Force a re-setup. Removes the stamps so the next build re-runs tsc
# and re-runs cmake configure. Useful when CMake state is wedged but
# you don't want to nuke the whole build/ tree (and trigger a full
# engine reclone).
setup:
	@rm -f $(TS_STAMP) $(CMAKE_CACHE)
	@$(MAKE) $(CMAKE_CACHE)

# Build, then launch.
run: build
	.$(P_SEP)$(BIN)

# tsc only — no cmake.
typescript: $(TS_STAMP)

# Wipe everything, including the FetchContent cache. Forces a fresh
# engine clone on the next build.
clean:
	$(CLEAN_CMD)

.PHONY: all build setup run typescript clean