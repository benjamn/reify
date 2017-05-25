"use strict";

const compiler = require("../lib/compiler.js");
const dynRequire = module.require ? module.require.bind(module) : __non_webpack_require__;
const fs = require("./fs.js");
const path = require("path");
const utils = require("./utils.js");

function compile(content, options) {
  options = Object.assign({}, options);
  return typeof options.filePath === "string"
    ? compileWithFilename(content, options)
    : compileAndCache(content, options);
}

exports.compile = compile;

function compileWithFilename(content, options) {
  try {
    return compileAndWrite(content, options);
  } catch (e) {
    e.message += " while processing file: " + options.filePath;
    throw e;
  }
}

function compileAndCache(content, options) {
  const result = compiler.compile(content, toCompileOptions(options));
  return options.pkgInfo.cache[options.cacheFilename] = result;
}

function compileAndWrite(content, options) {
  const compileOptions = toCompileOptions(options);
  const result = compiler.compile(content, compileOptions);

  if (result.sourceType === "module") {
    const cacheFilePath = path.join(options.cachePath, options.cacheFilename);
    const code = result.code;
    const isGzipped = path.extname(cacheFilePath) === ".gz";
    const content = () => isGzipped ? fs.gzip(code) : code;
    const encoding = isGzipped ? null : "utf8";
    const scopePath = options.pkgInfo.path;

    fs.writeFileDefer(cacheFilePath, content, { encoding, scopePath });
  }

  return result;
}

function toCompileOptions(options) {
  const compileOptions = {
    parse: void 0,
    repl: void 0,
    sourceType: void 0
  };

  const filePath = options.filePath;
  const config = options.pkgInfo.config;

  if (typeof config.parser === "string") {
    compileOptions.parse = dynRequire(config.parser).parse;
  }

  if (options.repl === true) {
    compileOptions.repl = true;
  }

  if (typeof filePath === "string") {
    let ext = path.extname(filePath);

    if (ext === ".gz") {
      ext = path.extname(path.basename(filePath, ext));
    }

    if (typeof config.sourceType === "string") {
      compileOptions.sourceType = config.sourceType;
    } else if (ext === ".mjs") {
      compileOptions.sourceType = "module";
    }
  }

  return compileOptions;
}
