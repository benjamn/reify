"use strict";

const fs = require("fs");
const compile = require("./caching-compiler.js").compile;
const Module = require("./runtime.js").Module;
const Mp = Module.prototype;

// Override Module.prototype._compile to compile any code that will be
// evaluated as a module.
const _compile = Mp._compile;
if (! _compile.reified) {
  (Mp._compile = function (content, filename) {
    return _compile.call(
      this,
      compile(content, getOptions(filename)),
      filename
    );
  }).reified = _compile;
}

function getOptions(filename) {
  const options = { filename: filename };
  const mtime = mtimeOrNull(filename);

  if (mtime !== null) {
    options.cacheKey = {
      source: "Module.prototype._compile",
      filename: filename,
      mtime: mtime
    };
  }

  return options;
}

function mtimeOrNull(path) {
  try {
    return fs.statSync(path).mtime;
  } catch (e) {
    return null;
  }
}
