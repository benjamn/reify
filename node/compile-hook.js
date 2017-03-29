"use strict";

const fs = require("fs");
const compiler = require("./caching-compiler.js");
const Module = require("./runtime.js").Module;
const Mp = Module.prototype;

// Override Module.prototype._compile to compile any code that will be
// evaluated as a module.
const _compile = Mp._compile;
if (! _compile.reified) {
  (Mp._compile = function (content, filename) {
    const stat = compiler.statOrNull(filename);
    return _compile.call(
      this,
      compiler.compile(content, {
        filename: filename,
        cacheKey: stat && {
          source: "Module.prototype._compile",
          filename: filename,
          mtime: stat.mtime.getTime()
        }
      }),
      filename
    );
  }).reified = _compile;
}
