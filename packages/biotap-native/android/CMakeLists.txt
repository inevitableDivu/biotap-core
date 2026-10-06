cmake_minimum_required(VERSION 3.22.1)

project(biotap_native_cpp)

set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_CXX_STANDARD 17)

# Locate zlib for hardware CRC32
find_package(ZLIB REQUIRED)

add_library(
    biotap_native_cpp
    SHARED
    src/main/cpp/apdu_chunker.cpp
    src/main/cpp/jsi_bindings.cpp
)

target_include_directories(
    biotap_native_cpp
    PRIVATE
    src/main/cpp
)

target_link_libraries(
    biotap_native_cpp
    PRIVATE
    ZLIB::ZLIB
    log
)
