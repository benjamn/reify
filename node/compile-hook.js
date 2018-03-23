"use strict";

const compiler = require("./caching-compiler.js");
const exts = require("module")._extensions;
const fs = require("./fs.js");
const path = require("path");
const runtime = require("../lib/runtime");
const utils = require("./utils.js");
const wrapper = require("./wrapper.js");

function extManager(func, mod, filename) {
  const filePath = path.resolve(filename);
  const pkgInfo = utils.getPkgInfo(path.dirname(filePath));
  const wrap = pkgInfo === null ? null : wrapper.find(exts, ".js", pkgInfo.range);

  // A wrapper should only be null for reify < 0.10.
  return wrap === null
    ? func.call(this, mod, filePath)
    : wrap.call(this, func, pkgInfo, mod, filePath);
}

function extWrap(func, pkgInfo, mod, filePath) {
  const cachePath = pkgInfo.cachePath;
  if (cachePath === null) {
    return func.call(this, mod, filePath);
  }

  const cache = pkgInfo.cache;
  const cacheKey = fs.mtime(filePath);
  const cacheFilename = utils.getCacheFileName(filePath, cacheKey, pkgInfo);

  let cacheValue = cache[cacheFilename];

  if (cacheValue === true) {
    const cacheFilePath = path.join(cachePath, cacheFilename);
    cacheValue = fs.readFile(cacheFilePath, "utf8");

  } else if (typeof cacheValue !== "string") {
    const options = {
      cacheFilename,
      cachePath,
      filePath,
      pkgInfo
    };

    const content = fs.readFile(filePath, "utf8");
    cacheValue = compiler.compile(content, options);
  }

  cache[cacheFilename] = cacheValue;

  runtime.enable(mod);
  mod._compile(cacheValue, filePath);

  if (! mod.loaded) {
    mod.loaded = true;
    mod.runSetters();
  }
}

wrapper.manage(exts, ".js", extManager);
wrapper.add(exts, ".js", extWrap);

const extsJs = wrapper.getMap(exts, ".js").raw;

[".gz", ".js.gz", ".mjs.gz", ".mjs"].forEach((key) => {
  if (typeof exts[key] !== "function") {
    // Mimic the built-in Node behavior of treating files with unrecognized
    // extensions as .js.
    exts[key] = extsJs;
  }
  wrapper.manage(exts, key, extManager);
  wrapper.add(exts, key, extWrap);
});
