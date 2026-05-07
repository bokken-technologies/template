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
# Both phases shell out to the bokken-cli executable located via
# find_program above. The CLI itself is built and installed by the
# engine; this project only consumes it.

if(NOT DEFINED SCRIPTS_DIR)
    message(FATAL_ERROR
        "SCRIPTS_DIR is not set. The Makefile passes this in after running tsc; "
        "if you're invoking cmake by hand, point it at your transpiled JS output:\n"
        "  cmake -S . -B build -DSCRIPTS_DIR=<absolute path to transpiled .js>")
endif()

set(COMPILED_SCRIPTS_DIR "${CMAKE_BINARY_DIR}/compiled")

# Compile transpiled JS → QuickJS bytecode before the executable links.
# The resulting .script files are picked up by the post-build pack step.
add_custom_command(TARGET ${PROJECT_NAME} PRE_BUILD
    COMMAND "${BOKKEN_CLI}" compile --source "${SCRIPTS_DIR}" --output "${COMPILED_SCRIPTS_DIR}"
    COMMENT "bokken-cli compile: scripts → bytecode"
    VERBATIM
)

# Pack each top-level subdirectory of assets/ into its own .assetpack so
# the engine can mount them independently (textures, audio, fonts, etc.).
set(ASSET_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/assets")
if(EXISTS "${ASSET_ROOT}")
    file(GLOB ASSET_GROUPS RELATIVE "${ASSET_ROOT}" "${ASSET_ROOT}/*")
    foreach(GROUP ${ASSET_GROUPS})
        if(IS_DIRECTORY "${ASSET_ROOT}/${GROUP}")
            add_custom_command(TARGET ${PROJECT_NAME} POST_BUILD
                COMMAND "${BOKKEN_CLI}" pack "${ASSET_ROOT}/${GROUP}" "$<TARGET_FILE_DIR:${PROJECT_NAME}>/assets/${GROUP}"
                COMMENT "bokken-cli pack: '${GROUP}'"
                VERBATIM
            )
        endif()
    endforeach()
endif()

# Pack the compiled scripts into their own assetpack alongside the others.
add_custom_command(TARGET ${PROJECT_NAME} POST_BUILD
    COMMAND "${BOKKEN_CLI}" pack "${COMPILED_SCRIPTS_DIR}" "$<TARGET_FILE_DIR:${PROJECT_NAME}>/assets/scripts"
    COMMENT "bokken-cli pack: compiled scripts"
    VERBATIM
)

# Deploy project.bokken next to the executable so the engine can read it
# at startup with a relative path.
add_custom_command(TARGET ${PROJECT_NAME} POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
            "${CMAKE_CURRENT_SOURCE_DIR}/project.bokken"
            "$<TARGET_FILE_DIR:${PROJECT_NAME}>/project.bokken"
    COMMENT "Deploying project.bokken"
    VERBATIM
)

# Copy the engine shared library next to the executable. On Apple this is
# also handled by BUILD_RPATH at dev time, but copying makes the build dir
# self-contained and ready for distribution. On Windows the .dll MUST be
# adjacent to the .exe — there's no rpath equivalent.
add_custom_command(TARGET ${PROJECT_NAME} POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
            "$<TARGET_FILE:BokkenEngine>"
            "$<TARGET_FILE_DIR:${PROJECT_NAME}>/$<TARGET_FILE_NAME:BokkenEngine>"
    COMMENT "Deploying BokkenEngine library"
    VERBATIM
)
