cmake_minimum_required(VERSION 3.16)

# OBJC is required on Apple because the engine's third-party dependencies
# (PhysFS, SDL3) include Objective-C platform glue that's compiled as part
# of the engine when we pull it in via FetchContent. Our own platform code
# (darwin/main.cpp) also touches CoreFoundation but that goes through the
# Apple system frameworks, not via OBJC sources.
if(APPLE)
    project(Template LANGUAGES CXX C OBJC)
else()
    project(Template LANGUAGES CXX C)
endif()

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# bokken-cli — required at build time
#
# The unified command-line tool that ships with the engine. We invoke its
# `compile` and `pack` subcommands from CMake custom commands during the
# build. This project assumes you scaffolded it via `bokken-cli new`,
# which means the CLI is already on your PATH; we double-check here so
# the failure mode is a friendly configure-time error rather than a
# cryptic build-time "command not found".
find_program(BOKKEN_CLI bokken-cli)
if(NOT BOKKEN_CLI)
    message(FATAL_ERROR
        "bokken-cli not found on PATH.\n"
        "This template's build invokes `bokken-cli compile` and "
        "`bokken-cli pack` to compile scripts and pack assets. Install "
        "the engine (which builds bokken-cli as a sibling target) and "
        "make sure its bin/ directory is on your PATH, then re-run "
        "`make build`.")
endif()
message(STATUS "Found bokken-cli: ${BOKKEN_CLI}")

# Engine acquisition
#
# The engine's library and public header (Bokken.hpp) are pulled in via
# FetchContent. First configure clones the repo into _deps/; subsequent
# configures reuse the cache.
#
# Override the tag at configure time to pin a specific engine revision:
#   cmake -B build -DBOKKEN_ENGINE_TAG=v1.2.3
include(FetchContent)

set(BOKKEN_ENGINE_REPOSITORY "https://github.com/bokken-technologies/bokken.git"
    CACHE STRING "Bokken engine git repository")
set(BOKKEN_ENGINE_TAG "master"
    CACHE STRING "Bokken engine git ref (branch, tag, or commit)")

# Once populated, don't re-clone on every reconfigure. Mirrors the engine's
# own FetchContent policy. Delete _deps/ or pass -DFETCHCONTENT_UPDATES_DISCONNECTED=OFF
# to force a fresh pull.
set(FETCHCONTENT_UPDATES_DISCONNECTED ON CACHE BOOL "" FORCE)

FetchContent_Declare(
    BokkenEngine
    GIT_REPOSITORY ${BOKKEN_ENGINE_REPOSITORY}
    GIT_TAG        ${BOKKEN_ENGINE_TAG}
    GIT_SHALLOW    TRUE
)

# Suppress warnings from the engine and its transitive dependencies. They
# are not ours to fix, and would otherwise drown out diagnostics from this
# project's own sources. Restored after FetchContent_MakeAvailable.
set(BOKKEN_SAVED_C_FLAGS "${CMAKE_C_FLAGS}")
set(BOKKEN_SAVED_CXX_FLAGS "${CMAKE_CXX_FLAGS}")
set(BOKKEN_SAVED_OBJC_FLAGS "${CMAKE_OBJC_FLAGS}")
string(APPEND CMAKE_C_FLAGS    " -w")
string(APPEND CMAKE_CXX_FLAGS  " -w")
string(APPEND CMAKE_OBJC_FLAGS " -w")

FetchContent_MakeAvailable(BokkenEngine)

set(CMAKE_C_FLAGS    "${BOKKEN_SAVED_C_FLAGS}")
set(CMAKE_CXX_FLAGS  "${BOKKEN_SAVED_CXX_FLAGS}")
set(CMAKE_OBJC_FLAGS "${BOKKEN_SAVED_OBJC_FLAGS}")

# Source files
file(GLOB_RECURSE COMMON_SOURCES "src/*.cpp")

if(APPLE)
    file(GLOB PLATFORM_SOURCES "darwin/*.cpp")
elseif(WIN32)
    file(GLOB PLATFORM_SOURCES "windows/*.cpp")
else()
    file(GLOB PLATFORM_SOURCES "linux/*.cpp")
endif()

add_executable(${PROJECT_NAME} ${COMMON_SOURCES} ${PLATFORM_SOURCES})

# Pin the executable's output directory to a fixed path. The asset pack
# and copy steps below write into the same directory, so the runtime
# layout (executable + project.bokken + assets/ + libBokkenEngine.dylib)
# is self-contained and ready to launch.
#
# Using a fixed path rather than $<TARGET_FILE_DIR:${PROJECT_NAME}>
# also dodges a dependency cycle: if the asset stamps wrote into the
# executable's own output dir, CMake would infer a dependency from the
# stamps to the executable target, while we also tell the executable
# to depend on the stamps via add_dependencies — circular.
set(DEPLOY_DIR "${CMAKE_BINARY_DIR}/bin")
file(MAKE_DIRECTORY "${DEPLOY_DIR}")
set_target_properties(${PROJECT_NAME} PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY "${DEPLOY_DIR}"
)

# Link the engine. The engine's CMakeLists exposes BokkenEngine as a
# SHARED target with PUBLIC include directories — that's everything we
# need. No third-party include paths to reproduce here.
target_link_libraries(${PROJECT_NAME} PRIVATE BokkenEngine)

if(APPLE)
    # CoreFoundation is used by darwin/main.cpp directly (CFBundle for the
    # working-directory fix when launched from a .app), not by the engine.
    target_link_libraries(${PROJECT_NAME} PRIVATE "-framework CoreFoundation")

    # The engine library lands in the FetchContent build directory's bin/
    # output. RPATH points there so the executable can find libBokkenEngine.dylib
    # at run-time during development; for distribution, the post-build copy
    # below puts it next to the executable and @executable_path takes over.
    set_target_properties(${PROJECT_NAME} PROPERTIES
        BUILD_RPATH   "$<TARGET_FILE_DIR:BokkenEngine>"
        INSTALL_RPATH "@executable_path"
    )
elseif(WIN32)
    # Standard Windows system libs often required when bypassing SDL_main.
    target_link_libraries(${PROJECT_NAME} PRIVATE shell32 user32 gdi32)
elseif(UNIX)
    target_link_libraries(${PROJECT_NAME} PRIVATE m pthread dl)
    set_target_properties(${PROJECT_NAME} PROPERTIES
        BUILD_RPATH   "$<TARGET_FILE_DIR:BokkenEngine>"
        INSTALL_RPATH "$ORIGIN"
    )
endif()

# Build steps — script compilation and asset packing
#
# Each phase is wired up as an output-producing custom command with
# explicit DEPENDS, so Ninja/Make can skip work whose inputs haven't
# changed. Earlier versions used `add_custom_command(TARGET ... PRE_BUILD)`
# / `POST_BUILD`, which always re-run every time the target is touched —
# fine for correctness, but expensive on every `make run`.
#
# The bytecode compile step depends on a stamp file written by the
# outer Makefile after a successful tsc run, rather than globbing the
# transpiled .js files at configure time. That way:
#
#   1. cmake configure can run before tsc has produced anything (clean
#      build) without a confusing "no inputs" warning.
#   2. tsc reruns trigger exactly one downstream rebuild — the bytecode
#      compile — and only because the stamp's mtime advanced. No need
#      for CMake to re-glob, no risk of the OS lying about directory
#      mtimes.

if(NOT DEFINED SCRIPTS_DIR)
    message(FATAL_ERROR
        "SCRIPTS_DIR is not set. The Makefile passes this in after running tsc; "
        "if you're invoking cmake by hand, point it at your transpiled JS output:\n"
        "  cmake -S . -B build -DSCRIPTS_DIR=<absolute path to transpiled .js>")
endif()

set(COMPILED_SCRIPTS_DIR "${CMAKE_BINARY_DIR}/compiled")
set(TS_STAMP "${CMAKE_BINARY_DIR}/.tsc.stamp")

# Compile transpiled JS → QuickJS bytecode. Depends on the tsc stamp
# instead of globbing the .js files, so this re-runs iff tsc actually
# re-ran.
set(COMPILE_STAMP "${CMAKE_BINARY_DIR}/.compile.stamp")

add_custom_command(
    OUTPUT  "${COMPILE_STAMP}"
    COMMAND "${BOKKEN_CLI}" compile --source "${SCRIPTS_DIR}" --output "${COMPILED_SCRIPTS_DIR}"
    COMMAND ${CMAKE_COMMAND} -E touch "${COMPILE_STAMP}"
    DEPENDS "${TS_STAMP}"
    COMMENT "bokken-cli compile: scripts → bytecode"
    VERBATIM
)

# Pack assets
#
# One stamp per top-level asset group. We capture inputs per-group at
# configure time, so a change to a single texture only re-packs the
# textures group. Adding a brand-new asset file requires a manual
# `make setup` to pick up — a deliberate trade for not running CMake's
# CONFIGURE_DEPENDS, which can trigger spurious reconfigures on
# directory mtime updates and defeat the whole point of the incremental
# setup.
set(ASSET_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/assets")
set(PACK_STAMPS "")

if(EXISTS "${ASSET_ROOT}")
    file(GLOB ASSET_GROUPS RELATIVE "${ASSET_ROOT}" "${ASSET_ROOT}/*")
    foreach(GROUP ${ASSET_GROUPS})
        if(IS_DIRECTORY "${ASSET_ROOT}/${GROUP}")
            file(GLOB_RECURSE GROUP_INPUTS "${ASSET_ROOT}/${GROUP}/*")
            set(GROUP_STAMP "${CMAKE_BINARY_DIR}/.pack-${GROUP}.stamp")

            add_custom_command(
                OUTPUT  "${GROUP_STAMP}"
                COMMAND "${BOKKEN_CLI}" pack "${ASSET_ROOT}/${GROUP}" "${DEPLOY_DIR}/assets/${GROUP}"
                COMMAND ${CMAKE_COMMAND} -E touch "${GROUP_STAMP}"
                DEPENDS ${GROUP_INPUTS}
                COMMENT "bokken-cli pack: '${GROUP}'"
                VERBATIM
            )
            list(APPEND PACK_STAMPS "${GROUP_STAMP}")
        endif()
    endforeach()
endif()

# Pack the compiled scripts into their own assetpack. Depends on the
# compile stamp, so it only re-runs when the bytecode has actually been
# regenerated.
set(SCRIPTS_PACK_STAMP "${CMAKE_BINARY_DIR}/.pack-scripts.stamp")
add_custom_command(
    OUTPUT  "${SCRIPTS_PACK_STAMP}"
    COMMAND "${BOKKEN_CLI}" pack "${COMPILED_SCRIPTS_DIR}" "${DEPLOY_DIR}/assets/scripts"
    COMMAND ${CMAKE_COMMAND} -E touch "${SCRIPTS_PACK_STAMP}"
    DEPENDS "${COMPILE_STAMP}"
    COMMENT "bokken-cli pack: compiled scripts"
    VERBATIM
)
list(APPEND PACK_STAMPS "${SCRIPTS_PACK_STAMP}")

# Deploy project.bokken and the engine library
#
# These two stay as TARGET POST_BUILD commands because they use
# copy_if_different, which is itself a no-op when the destination is
# already up to date — making them OUTPUT-driven would buy nothing
# beyond more complexity. They cost ~milliseconds even on every link.
# Note: writing to ${DEPLOY_DIR} (a plain string), not
# $<TARGET_FILE_DIR:${PROJECT_NAME}>, so no implicit cycle back into the
# executable.
add_custom_command(TARGET ${PROJECT_NAME} POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
            "${CMAKE_CURRENT_SOURCE_DIR}/project.bokken"
            "${DEPLOY_DIR}/project.bokken"
    COMMENT "Deploying project.bokken"
    VERBATIM
)

add_custom_command(TARGET ${PROJECT_NAME} POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
            "$<TARGET_FILE:BokkenEngine>"
            "${DEPLOY_DIR}/$<TARGET_FILE_NAME:BokkenEngine>"
    COMMENT "Deploying BokkenEngine library"
    VERBATIM
)

# Glue: bind the OUTPUT-driven phases to the executable
#
# Custom commands with OUTPUT only run if something *demands* their
# output. We aggregate every stamp into a single phony target, mark it
# ALL so it's part of the default build, and make the executable depend
# on it. Result: building the executable transitively triggers any
# stale phases, and a fully up-to-date tree re-runs nothing.
add_custom_target(bokken_assets ALL DEPENDS ${PACK_STAMPS})
add_dependencies(${PROJECT_NAME} bokken_assets)