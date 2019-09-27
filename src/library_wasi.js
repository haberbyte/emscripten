/*
 * Copyright 2019 The Emscripten Authors.  All rights reserved.
 * Emscripten is available under two separate licenses, the MIT license and the
 * University of Illinois/NCSA Open Source License.  Both these licenses can be
 * found in the LICENSE file.
 */

var WasiLibrary = {
  proc_exit__deps: ['exit'],
  proc_exit: function(code) {
    return _exit(code);
  },

  emscripten_get_environ: function() {
    if (!_emscripten_get_environ.ENV) {
      var ENV = {};
      ENV['USER'] = ENV['LOGNAME'] = 'web_user';
      ENV['PATH'] = '/';
      ENV['PWD'] = '/';
      ENV['HOME'] = '/home/web_user';
      // Browser language detection #8751
      ENV['LANG'] = ((typeof navigator === 'object' &&navigator.languages && navigator.languages[0]) || 'C').replace('-', '_') + '.UTF-8';
      ENV['_'] = thisProgram;
      var strings = [];
      for (var key in ENV) {
        strings.push(key + '=' + ENV[key]);
      }
      _emscripten_get_environ.strings = strings;
    }
    return _emscripten_get_environ.strings;
  },

  environ_sizes_get__deps: ['emscripten_get_environ'],
  environ_sizes_get: function(environ_count, environ_buf_size) {
    var strings = _emscripten_get_environ();
    {{{ makeSetValue('environ_count', 0, 'strings.length', 'i32') }}};
    var bufSize = 0;
    strings.forEach(function(string) {
      bufSize += string.length + 1;
    });
    {{{ makeSetValue('environ_buf_size', 0, 'bufSize', 'i32') }}};
    return 0;
  },

  environ_get__deps: ['emscripten_get_environ'],
  environ_get: function(__environ, environ_buf) {
    var strings = _emscripten_get_environ();
    var bufSize = 0;
    strings.forEach(function(string, i) {
      var ptr = environ_buf + bufSize;
      {{{ makeSetValue('__environ', 'i * 4', 'ptr', 'i32') }}};
      writeAsciiToMemory(string, ptr);
      bufSize += string.length + 1;
    });
    return 0;
  },

  args_sizes_get: function(argc, argv_buf_size) {
#if MAIN_READS_PARAMS
    {{{ makeSetValue('argc', 0, 'mainArgs.length', 'i32') }}};
    var bufSize = 0;
    mainArgs.forEach(function(arg) {
      bufSize += arg.length + 1;
    });
    {{{ makeSetValue('argv_buf_size', 0, 'bufSize', 'i32') }}};
#else
    {{{ makeSetValue('argc', 0, '0', 'i32') }}};
#endif
    return 0;
  },

  args_get: function(argv, argv_buf) {
#if MAIN_READS_PARAMS
    var bufSize = 0;
    mainArgs.forEach(function(arg, i) {
      var ptr = argv_buf + bufSize;
      {{{ makeSetValue('argv', 'i * 4', 'ptr', 'i32') }}};
      writeAsciiToMemory(arg, ptr);
      bufSize += arg.length + 1;
    });
#endif
    return 0;
  },
};

// Fallback for cases where the wasi_unstable.name prefixing fails,
// and we have the full name from C. This happens in fastcomp (which
// lacks the attribute to set the import module and base names) and
// in LTO mode (as bitcode does not preserve them).
if (!WASM_BACKEND || !WASM_OBJECT_FILES) {
  for (var x in WasiLibrary) {
    if (x.indexOf('__deps') >= 0) continue;
    WasiLibrary['__wasi_' + x] = x;
  }
}

mergeInto(LibraryManager.library, WasiLibrary);
