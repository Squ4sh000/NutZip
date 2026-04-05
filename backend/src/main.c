#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#ifdef _WIN32
#include <windows.h>
#include <shellapi.h>
#include <process.h>
#endif
#include "nutz.h"

void print_usage() {
    printf("NutZip CLI by Squ4sh000 (Built for high-performance)\n");
    printf("====================================================\n");
    printf("Compress usage:   nutzip c -o <output> -f <format> [-l level] <input1> [input2] ...\n");
    printf("Decompress usage: nutzip x -i <input> -o <output> [-f format]\n");
    printf("\n");
    printf("Options:\n");
    printf("  c               Create archive (compress)\n");
    printf("  x               Extract archive (decompress)\n");
    printf("  -o <path>       Output path (required)\n");
    printf("  -i <path>       Input path (required for extract)\n");
    printf("  -f <format>     Format: .zip, .tar, .gz, .xz, .nutz\n");
    printf("  -l <1-9>        Compression level (default: 6)\n");
    printf("  -h, --help      Show this help message\n");
    printf("====================================================\n");
}

#ifdef _WIN32
// Helper to execute command with Unicode support on Windows
static int execute_cmd_win(const wchar_t* cmd) {
    STARTUPINFOW si;
    PROCESS_INFORMATION pi;
    ZeroMemory(&si, sizeof(si));
    si.cb = sizeof(si);
    ZeroMemory(&pi, sizeof(pi));

    wchar_t* cmd_copy = _wcsdup(cmd);
    if (!CreateProcessW(NULL, cmd_copy, NULL, NULL, FALSE, 0, NULL, NULL, &si, &pi)) {
        free(cmd_copy);
        return -1;
    }

    WaitForSingleObject(pi.hProcess, INFINITE);
    DWORD exit_code;
    GetExitCodeProcess(pi.hProcess, &exit_code);
    CloseHandle(pi.hProcess);
    CloseHandle(pi.hThread);
    free(cmd_copy);
    return (int)exit_code;
}

int wmain(int argc, wchar_t* argv[]) {
    if (argc < 2 || wcscmp(argv[1], L"-h") == 0 || wcscmp(argv[1], L"--help") == 0) {
        print_usage();
        return 0;
    }

    wchar_t* action = argv[1];
    wchar_t* w_output_path = NULL;
    wchar_t* w_input_path = NULL;
    wchar_t* w_format = NULL;
    int level = 6;
    int input_start_idx = 0;

    // Very basic argument parser
    for (int i = 2; i < argc; i++) {
        if (wcscmp(argv[i], L"-o") == 0 && i + 1 < argc) {
            w_output_path = argv[++i];
        } else if (wcscmp(argv[i], L"-i") == 0 && i + 1 < argc) {
            w_input_path = argv[++i];
        } else if (wcscmp(argv[i], L"-f") == 0 && i + 1 < argc) {
            w_format = argv[++i];
        } else if (wcscmp(argv[i], L"-l") == 0 && i + 1 < argc) {
            level = _wtoi(argv[++i]);
        } else {
            // Assume the rest are input files for compression
            input_start_idx = i;
            break;
        }
    }

    if (wcscmp(action, L"c") == 0 || wcscmp(action, L"compress") == 0) {
        if (!w_output_path || input_start_idx == 0) {
            print_usage();
            return 1;
        }
        if (!w_format) {
            // Try to infer format from output path
            if (wcsstr(w_output_path, L".zip")) w_format = L".zip";
            else if (wcsstr(w_output_path, L".tar")) w_format = L".tar";
            else if (wcsstr(w_output_path, L".gz")) w_format = L".gz";
            else if (wcsstr(w_output_path, L".xz")) w_format = L".xz";
            else if (wcsstr(w_output_path, L".nutz")) w_format = L".nutz";
            else w_format = L".zip"; // Default
        }

        int input_count = argc - input_start_idx;

        if (wcscmp(w_format, L".nutz") == 0) {
            wchar_t temp_path[MAX_PATH], temp_file[MAX_PATH];
            GetTempPathW(MAX_PATH, temp_path);
            GetTempFileNameW(temp_path, L"NUT", 0, temp_file);

            wchar_t tar_cmd[32768];
            swprintf(tar_cmd, 32768, L"tar.exe --options hdrcharset=UTF-8 -cf \"%ls\"", temp_file);
            for (int i = 0; i < input_count; i++) {
                wchar_t* w_in = argv[input_start_idx + i];
                wchar_t drive[_MAX_DRIVE], dir[_MAX_DIR], fname[_MAX_FNAME], ext[_MAX_EXT];
                _wsplitpath(w_in, drive, dir, fname, ext);
                wchar_t working_dir[MAX_PATH], file_to_zip[MAX_PATH];
                swprintf(working_dir, MAX_PATH, L"%ls%ls", drive, dir);
                size_t len_dir = wcslen(working_dir);
                if (len_dir > 0 && working_dir[len_dir - 1] == L'\\') working_dir[len_dir - 1] = L'\0';
                swprintf(file_to_zip, MAX_PATH, L"%ls%ls", fname, ext);
                
                wchar_t segment[MAX_PATH * 2];
                if (wcslen(working_dir) > 0) swprintf(segment, MAX_PATH * 2, L" -C \"%ls\" \"%ls\"", working_dir, file_to_zip);
                else swprintf(segment, MAX_PATH * 2, L" \"%ls\"", file_to_zip);
                wcscat(tar_cmd, segment);
            }
            
            if (execute_cmd_win(tar_cmd) != 0) { DeleteFileW(temp_file); return 1; }

            char *in_u8, *out_u8;
            int len = WideCharToMultiByte(CP_UTF8, 0, temp_file, -1, NULL, 0, NULL, NULL);
            in_u8 = malloc(len); WideCharToMultiByte(CP_UTF8, 0, temp_file, -1, in_u8, len, NULL, NULL);
            int len2 = WideCharToMultiByte(CP_UTF8, 0, w_output_path, -1, NULL, 0, NULL, NULL);
            out_u8 = malloc(len2); WideCharToMultiByte(CP_UTF8, 0, w_output_path, -1, out_u8, len2, NULL, NULL);

            int res = nutz_compress(in_u8, out_u8, level);
            free(in_u8); free(out_u8); DeleteFileW(temp_file);
            return res;
        } else {
            wchar_t cmd[32768];
            wchar_t* extra_opts = wcsstr(w_format, L".zip") ? L"--options zip:hdrcharset=UTF-8" : L"--options hdrcharset=UTF-8";
            swprintf(cmd, 32768, L"tar.exe %ls -a -cf \"%ls\"", extra_opts, w_output_path);

            for (int i = 0; i < input_count; i++) {
                wchar_t* w_in = argv[input_start_idx + i];
                wchar_t drive[_MAX_DRIVE], dir[_MAX_DIR], fname[_MAX_FNAME], ext[_MAX_EXT];
                _wsplitpath(w_in, drive, dir, fname, ext);
                wchar_t working_dir[MAX_PATH], file_to_zip[MAX_PATH];
                swprintf(working_dir, MAX_PATH, L"%ls%ls", drive, dir);
                size_t len_dir = wcslen(working_dir);
                if (len_dir > 0 && working_dir[len_dir - 1] == L'\\') working_dir[len_dir - 1] = L'\0';
                swprintf(file_to_zip, MAX_PATH, L"%ls%ls", fname, ext);

                wchar_t segment[MAX_PATH * 2];
                if (wcslen(working_dir) > 0) swprintf(segment, MAX_PATH * 2, L" -C \"%ls\" \"%ls\"", working_dir, file_to_zip);
                else swprintf(segment, MAX_PATH * 2, L" \"%ls\"", file_to_zip);
                wcscat(cmd, segment);
            }
            return execute_cmd_win(cmd);
        }
    } else if (wcscmp(action, L"x") == 0 || wcscmp(action, L"extract") == 0 || wcscmp(action, L"decompress") == 0) {
        if (!w_input_path || !w_output_path) {
            print_usage();
            return 1;
        }
        if (!w_format) {
            if (wcsstr(w_input_path, L".nutz")) w_format = L".nutz";
            else w_format = L".zip";
        }

        if (wcscmp(w_format, L".nutz") == 0) {
            wchar_t temp_path[MAX_PATH], temp_file[MAX_PATH];
            GetTempPathW(MAX_PATH, temp_path);
            GetTempFileNameW(temp_path, L"UNT", 0, temp_file);

            char *in_u8, *out_u8;
            int len = WideCharToMultiByte(CP_UTF8, 0, w_input_path, -1, NULL, 0, NULL, NULL);
            in_u8 = malloc(len); WideCharToMultiByte(CP_UTF8, 0, w_input_path, -1, in_u8, len, NULL, NULL);
            int len2 = WideCharToMultiByte(CP_UTF8, 0, temp_file, -1, NULL, 0, NULL, NULL);
            out_u8 = malloc(len2); WideCharToMultiByte(CP_UTF8, 0, temp_file, -1, out_u8, len2, NULL, NULL);

            int res = nutz_decompress(in_u8, out_u8);
            free(in_u8); free(out_u8);
            if (res != 0) { DeleteFileW(temp_file); return res; }

            wchar_t clean_out[MAX_PATH]; wcscpy(clean_out, w_output_path);
            size_t lo = wcslen(clean_out);
            if (lo > 0 && clean_out[lo - 1] == L'\\') clean_out[lo - 1] = L'\0';
            CreateDirectoryW(clean_out, NULL);

            wchar_t ex_cmd[8192];
            swprintf(ex_cmd, 8192, L"tar.exe --options hdrcharset=UTF-8 -xf \"%ls\" -C \"%ls\"", temp_file, clean_out);
            int ex_res = execute_cmd_win(ex_cmd);
            DeleteFileW(temp_file);
            return ex_res;
        } else {
            wchar_t clean_out[MAX_PATH]; wcscpy(clean_out, w_output_path);
            size_t lo = wcslen(clean_out);
            if (lo > 0 && clean_out[lo - 1] == L'\\') clean_out[lo - 1] = L'\0';
            CreateDirectoryW(clean_out, NULL);
            wchar_t cmd[8192];
            swprintf(cmd, 8192, L"tar.exe --options hdrcharset=UTF-8 -xf \"%ls\" -C \"%ls\"", w_input_path, clean_out);
            return execute_cmd_win(cmd);
        }
    } else if (wcscmp(action, L"compress") == 0 || wcscmp(action, L"decompress") == 0) {
        // Handle legacy positional arguments for the GUI (backward compatibility)
        if (wcscmp(action, L"compress") == 0) {
            // Positional: nutzip compress <output> <format> <level> <count> <in1>...
            w_output_path = argv[2];
            w_format = argv[3];
            level = _wtoi(argv[4]);
            int count = _wtoi(argv[5]);
            // Re-route to standard create logic by setting args
            // (Keeping this simple as the GUI call is well-defined)
            // Just reuse the logic above by jumping or wrapping. 
            // For now, let's just implement the old logic here to be safe.
            if (wcscmp(w_format, L".nutz") == 0) {
                wchar_t* w_in = argv[6];
                char *in_u8, *out_u8;
                int len = WideCharToMultiByte(CP_UTF8, 0, w_in, -1, NULL, 0, NULL, NULL);
                in_u8 = malloc(len); WideCharToMultiByte(CP_UTF8, 0, w_in, -1, in_u8, len, NULL, NULL);
                int len2 = WideCharToMultiByte(CP_UTF8, 0, w_output_path, -1, NULL, 0, NULL, NULL);
                out_u8 = malloc(len2); WideCharToMultiByte(CP_UTF8, 0, w_output_path, -1, out_u8, len2, NULL, NULL);
                int res = nutz_compress(in_u8, out_u8, level);
                free(in_u8); free(out_u8); return res;
            } else {
                wchar_t cmd[32768];
                wchar_t* extra_opts = wcsstr(w_format, L".zip") ? L"--options zip:hdrcharset=UTF-8" : L"--options hdrcharset=UTF-8";
                swprintf(cmd, 32768, L"tar.exe %ls -a -cf \"%ls\"", extra_opts, w_output_path);
                for (int i = 0; i < count; i++) {
                    wchar_t* w_in = argv[6 + i];
                    wchar_t drive[_MAX_DRIVE], dir[_MAX_DIR], fname[_MAX_FNAME], ext[_MAX_EXT];
                    _wsplitpath(w_in, drive, dir, fname, ext);
                    wchar_t working_dir[MAX_PATH], file_to_zip[MAX_PATH];
                    swprintf(working_dir, MAX_PATH, L"%ls%ls", drive, dir);
                    size_t len_dir = wcslen(working_dir);
                    if (len_dir > 0 && working_dir[len_dir - 1] == L'\\') working_dir[len_dir - 1] = L'\0';
                    swprintf(file_to_zip, MAX_PATH, L"%ls%ls", fname, ext);
                    wchar_t segment[MAX_PATH * 2];
                    if (wcslen(working_dir) > 0) swprintf(segment, MAX_PATH * 2, L" -C \"%ls\" \"%ls\"", working_dir, file_to_zip);
                    else swprintf(segment, MAX_PATH * 2, L" \"%ls\"", file_to_zip);
                    wcscat(cmd, segment);
                }
                return execute_cmd_win(cmd);
            }
        } else {
            // Positional: nutzip decompress <input> <output> <format>
            w_input_path = argv[2];
            w_output_path = argv[3];
            w_format = argv[4];
            // Reuse decompress logic above or just call tar
            wchar_t clean_out[MAX_PATH]; wcscpy(clean_out, w_output_path);
            size_t lo = wcslen(clean_out);
            if (lo > 0 && clean_out[lo - 1] == L'\\') clean_out[lo - 1] = L'\0';
            CreateDirectoryW(clean_out, NULL);
            wchar_t cmd[8192];
            swprintf(cmd, 8192, L"tar.exe --options hdrcharset=UTF-8 -xf \"%ls\" -C \"%ls\"", w_input_path, clean_out);
            return execute_cmd_win(cmd);
        }
    }

    return 0;
}
#else
int main(int argc, char* argv[]) {
    if (argc < 5) {
        print_usage();
        return 1;
    }

    const char* action = argv[1];
    const char* input_path = argv[2];
    const char* output_path = argv[3];
    const char* format = argv[4];
    int level = (argc > 5) ? atoi(argv[5]) : 6;

    if (strcmp(action, "compress") == 0) {
        if (strcmp(format, ".nutz") == 0) {
            return nutz_compress(input_path, output_path, level);
        } else {
            printf("Compression for standard formats requires Windows tar.exe implementation.\n");
            return 1;
        }
    } else if (strcmp(action, "decompress") == 0) {
        if (strcmp(format, ".nutz") == 0) {
            return nutz_decompress(input_path, output_path);
        } else {
            printf("Decompression for standard formats requires Windows tar.exe implementation.\n");
            return 1;
        }
    }

    return 0;
}
#endif
