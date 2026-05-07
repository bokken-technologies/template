APP_NAME = Button

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

BUILD_TEMP = build$(P_SEP)$(PLATFORM_DIR)
SCRIPTS_OUT = $(BUILD_TEMP)$(P_SEP)transpiled

# Optional: pin the engine to a specific git ref. Override on the command line:
#   make build BOKKEN_ENGINE_TAG=v1.2.3
BOKKEN_ENGINE_TAG ?= master

all: build

# `setup` depends on `typescript` because the CMake configure step reads
# the transpiled JS directory through SCRIPTS_DIR. Running setup before
# tsc would point CMake at an empty (or stale) directory.
setup: typescript
	cmake -S . -B $(BUILD_TEMP) -DCMAKE_BUILD_TYPE=Debug \
	    -DSCRIPTS_DIR="$(abspath $(SCRIPTS_OUT))" \
	    -DBOKKEN_ENGINE_TAG="$(BOKKEN_ENGINE_TAG)"

build: setup
	cmake --build $(BUILD_TEMP)
	@echo "Build complete. Executable & assets deployed to $(BUILD_TEMP)."

typescript:
	@echo "Compiling TypeScript..."
	@mkdir -p $(SCRIPTS_OUT)
	npx tsc --project tsconfig.json --outDir $(SCRIPTS_OUT)

run: build
	.$(P_SEP)$(BUILD_TEMP)$(P_SEP)$(APP_NAME)

clean:
	$(CLEAN_CMD)

.PHONY: all setup build run clean typescript
