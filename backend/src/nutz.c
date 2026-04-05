#include "nutz.h"
#include <time.h>
#include <stddef.h>
#include <zlib.h>

#ifdef _WIN32
#include <windows.h>
#endif

// Helper function to handle UTF-8 paths on Windows
static FILE* nutz_fopen(const char* path, const char* mode) {
#ifdef _WIN32
    int len = MultiByteToWideChar(CP_UTF8, 0, path, -1, NULL, 0);
    if (len <= 0) return NULL;
    wchar_t* wpath = (wchar_t*)malloc(len * sizeof(wchar_t));
    MultiByteToWideChar(CP_UTF8, 0, path, -1, wpath, len);

    int mlen = MultiByteToWideChar(CP_UTF8, 0, mode, -1, NULL, 0);
    wchar_t* wmode = (wchar_t*)malloc(mlen * sizeof(wchar_t));
    MultiByteToWideChar(CP_UTF8, 0, mode, -1, wmode, mlen);

    FILE* f = _wfopen(wpath, wmode);
    free(wpath);
    free(wmode);
    return f;
#else
    return fopen(path, mode);
#endif
}

EXPORT int nutz_compress(const char* input_path, const char* output_path, int level) {
    FILE* in = nutz_fopen(input_path, "rb");
    if (!in) return NUTZ_ERROR_FILE_NOT_FOUND;

    fseek(in, 0, SEEK_END);
    uint64_t original_size = ftell(in);
    fseek(in, 0, SEEK_SET);

    FILE* out = nutz_fopen(output_path, "wb");
    if (!out) {
        fclose(in);
        return NUTZ_ERROR_FILE_NOT_FOUND;
    }

    // Header
    nutz_header_t header;
    memcpy(header.magic, NUTZ_MAGIC, 4);
    header.version = NUTZ_VERSION;
    header.original_size = original_size;
    header.compressed_size = 0;
    header.checksum = 0;
    fwrite(&header, sizeof(nutz_header_t), 1, out);

    // Initialize zlib deflate
    z_stream strm;
    strm.zalloc = Z_NULL;
    strm.zfree = Z_NULL;
    strm.opaque = Z_NULL;
    
    // Map UI level (1-9) to zlib level
    // 9 is best compression for .nutz extreme format
    int z_level = (level > 9) ? 9 : (level < 1 ? 1 : level);
    if (deflateInit(&strm, z_level) != Z_OK) {
        fclose(in);
        fclose(out);
        return NUTZ_ERROR_COMPRESSION_FAILED;
    }

    unsigned char in_buf[128 * 1024];
    unsigned char out_buf[128 * 1024];
    uint64_t total_compressed = 0;
    int flush;

    do {
        strm.avail_in = fread(in_buf, 1, sizeof(in_buf), in);
        flush = feof(in) ? Z_FINISH : Z_NO_FLUSH;
        strm.next_in = in_buf;

        do {
            strm.avail_out = sizeof(out_buf);
            strm.next_out = out_buf;
            deflate(&strm, flush);
            size_t have = sizeof(out_buf) - strm.avail_out;
            fwrite(out_buf, 1, have, out);
            total_compressed += have;
        } while (strm.avail_out == 0);
    } while (flush != Z_FINISH);

    deflateEnd(&strm);

    // Update header
    fseek(out, offsetof(nutz_header_t, compressed_size), SEEK_SET);
    fwrite(&total_compressed, sizeof(uint64_t), 1, out);

    fclose(in);
    fclose(out);
    return NUTZ_OK;
}

EXPORT int nutz_decompress(const char* input_path, const char* output_path) {
    FILE* in = nutz_fopen(input_path, "rb");
    if (!in) return NUTZ_ERROR_FILE_NOT_FOUND;

    nutz_header_t header;
    if (fread(&header, sizeof(nutz_header_t), 1, in) != 1) {
        fclose(in);
        return NUTZ_ERROR_COMPRESSION_FAILED;
    }

    if (memcmp(header.magic, NUTZ_MAGIC, 4) != 0) {
        fclose(in);
        return NUTZ_ERROR_COMPRESSION_FAILED;
    }

    FILE* out = nutz_fopen(output_path, "wb");
    if (!out) {
        fclose(in);
        return NUTZ_ERROR_FILE_NOT_FOUND;
    }

    // Initialize zlib inflate
    z_stream strm;
    strm.zalloc = Z_NULL;
    strm.zfree = Z_NULL;
    strm.opaque = Z_NULL;
    strm.avail_in = 0;
    strm.next_in = Z_NULL;
    if (inflateInit(&strm) != Z_OK) {
        fclose(in);
        fclose(out);
        return NUTZ_ERROR_COMPRESSION_FAILED;
    }

    unsigned char in_buf[128 * 1024];
    unsigned char out_buf[128 * 1024];
    int ret;

    do {
        strm.avail_in = fread(in_buf, 1, sizeof(in_buf), in);
        if (strm.avail_in == 0) break;
        strm.next_in = in_buf;

        do {
            strm.avail_out = sizeof(out_buf);
            strm.next_out = out_buf;
            ret = inflate(&strm, Z_NO_FLUSH);
            if (ret == Z_NEED_DICT || ret == Z_DATA_ERROR || ret == Z_MEM_ERROR) {
                inflateEnd(&strm);
                fclose(in);
                fclose(out);
                return NUTZ_ERROR_COMPRESSION_FAILED;
            }
            size_t have = sizeof(out_buf) - strm.avail_out;
            fwrite(out_buf, 1, have, out);
        } while (strm.avail_out == 0);
    } while (ret != Z_STREAM_END);

    inflateEnd(&strm);
    fclose(in);
    fclose(out);
    return NUTZ_OK;
}
