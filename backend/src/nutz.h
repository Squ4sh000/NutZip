#ifndef NUTZ_H
#define NUTZ_H

#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>

#ifdef _WIN32
#define EXPORT __declspec(dllexport)
#else
#define EXPORT
#endif

// Error codes
#define NUTZ_OK 0
#define NUTZ_ERROR_FILE_NOT_FOUND 1
#define NUTZ_ERROR_MALLOC_FAILED 2
#define NUTZ_ERROR_COMPRESSION_FAILED 3

// The .nutz format header
#define NUTZ_MAGIC "NUTZ"
#define NUTZ_VERSION 1

typedef struct {
    char magic[4];
    uint32_t version;
    uint64_t original_size;
    uint64_t compressed_size;
    uint32_t checksum;
} nutz_header_t;

EXPORT int nutz_compress(const char* input_path, const char* output_path, int level);
EXPORT int nutz_decompress(const char* input_path, const char* output_path);

#endif
