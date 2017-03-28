"use strict";

const fs = require("fs");
const path = require("path");
const createHash = require("crypto").createHash;
const compile = require("../lib/compiler.js").compile;
const dynRequire = module.require ? module.require.bind(module) : __non_webpack_require__;
const hasOwn = Object.prototype.hasOwnProperty;

// Map from absolute file paths to the package.json that governs them.
const pkgInfoCache = Object.create(null);

// Take only the major and minor components of the reify version, so that
// we don't invalidate the cache every time a patch version is released.
const reifyVersion = require("../package.json")
  .version.split(".", 2).join(".");

const DEFAULT_CACHE_DIR = ".reify-cache";

exports.compile = (content, options) => {
  options = options || Object.create(null);

  if (options.filename === "repl") {
    // Treat the REPL as if there was no filename.
    options.filename = null;
  }

  const pkgInfo = options.filename
    ? getPkgInfo(options.filename)
    : fallbackPkgInfo;

  if (! pkgInfo) {
    return content;
  }

  return options.filename
    ? readWithCacheAndFilename(pkgInfo, content, options)
    : readWithCache(pkgInfo, content, options);
};

function readWithCacheAndFilename(pkgInfo, content, options) {
  try {
    return readWithCache(pkgInfo, content, options);
  } catch (e) {
    e.message += ' while processing file: ' + options.filename;
    throw e;
  }
}

// Used when compile filename argument is falsy. Enables in-memory
// caching, at least.
const fallbackPkgInfo = {
  cache: Object.create(null)
};

function readWithCache(pkgInfo, content, options) {
  const json = pkgInfo && pkgInfo.json;
  const reify = json && json.reify;

  const cacheFilename =
    getCacheFilename(options.cacheKey || content, reify);

  const absCachePath = typeof pkgInfo.cacheDir === "string" &&
    path.join(pkgInfo.cacheDir, cacheFilename);

  if (hasOwn.call(pkgInfo.cache, cacheFilename)) {
    let cacheValue = pkgInfo.cache[cacheFilename];

    if (cacheValue === true && absCachePath) {
      cacheValue = pkgInfo.cache[cacheFilename] =
        readFileOrNull(absCachePath);
    }

    if (typeof cacheValue === "string") {
      return cacheValue;
    }
  }

  const compileOptions = {
    ast: false
  };

  if (reify && reify.parser) {
    compileOptions.parse = dynRequire(reify.parser).parse;
  };

  content = compile(content, compileOptions).code;

  if (compileOptions.identical) {
    // Don't bother caching result if compiler made no changes.
    return content;
  }

  pkgInfo.cache[cacheFilename] = content;

  if (typeof pkgInfo.cacheDir === "string") {
    // Writing cache files is something that should only happen at package
    // development time, so it's acceptable to use fs.writeFileSync
    // instead of some complicated asynchronous-but-atomic strategy.
    fs.writeFileSync(absCachePath, content, "utf8");
  }

  return content;
}

function readFileOrNull(filename) {
  try {
    return fs.readFileSync(filename, "utf8");
  } catch (e) {
    return null;
  }
}

function getCacheFilename() {
  const args = [];
  const argc = arguments.length;
  for (let i = 0; i < argc; ++i) {
    args.push(arguments[i]);
  }

  return createHash("sha1")
    .update(reifyVersion)
    .update("\0")
    .update(JSON.stringify(args))
    .digest("hex") + ".js";
}

function getPkgInfo(filename) {
  if (hasOwn.call(pkgInfoCache, filename)) {
    return pkgInfoCache[filename];
  }

  const stat = statOrNull(filename);
  if (! stat) {
    return pkgInfoCache[filename] = null;
  }

  if (stat.isDirectory()) {
    if (path.basename(filename) === "node_modules") {
      return pkgInfoCache[filename] = null;
    }

    const pkgInfo = readPkgInfo(filename);
    if (pkgInfo) {
      return pkgInfoCache[filename] = pkgInfo;
    }
  }

  const parentDir = path.dirname(filename);
  return pkgInfoCache[filename] =
    parentDir !== filename &&
    getPkgInfo(parentDir);
}

function statOrNull(filename) {
  try {
    return fs.statSync(filename);
  } catch (e) {
    return null;
  }
}

function readPkgInfo(dir) {
  let pkg;

  try {
    pkg = JSON.parse(fs.readFileSync(
      path.join(dir, "package.json")
    ));

  } catch (e) {
    if (! (e instanceof SyntaxError ||
           e.code === "ENOENT")) {
      throw e;
    }
  }

  if (pkg && typeof pkg === "object") {
    const reify = pkg.reify;
    if (reify === false) {
      // An explicit "reify": false property in package.json disables
      // reification even if "reify" is listed as a dependency.
      return null;
    }

    const check = (name) => (
      typeof pkg[name] === "object" && hasOwn.call(pkg[name], "reify")
    );

    if (! check("dependencies") &&
        ! check("peerDependencies") &&
        // Use case: a package.json file may have "reify" in its
        // "devDependencies" section because it expects another package or
        // application to enable reification in production, but needs its
        // own copy of the "reify" package during development. Disabling
        // reification in production when it was enabled in development
        // would be dangerous in this case.
        ! check("devDependencies")) {
      return null;
    }

    const pkgInfo = {
      json: pkg,
      cacheDir: null,
      cache: Object.create(null)
    };

    if (reify) {
      let cacheDir = hasOwn.call(reify, "cache-directory")
        ? reify["cache-directory"]
        : DEFAULT_CACHE_DIR;

      if (typeof cacheDir === "string") {
        cacheDir = mkdirp(dir, cacheDir);

        const cacheFiles = cacheDir && fs.readdirSync(cacheDir);
        if (cacheFiles) {
          // If we leave pkgInfo.cacheDir === null, we won't be able to
          // save cache files to disk, but we can still cache compilation
          // results in memory.
          pkgInfo.cacheDir = cacheDir;

          const filesCount = cacheFiles.length;

          for (let i = 0; i < filesCount; ++i) {
            // Later we'll change the value to the actual contents of the
            // file, but for now we merely register that it exists.
            const file = cacheFiles[i];
            if (/\.js$/.test(file)) {
              pkgInfo.cache[file] = true;
            }
          }
        }
      }
    }

    return pkgInfo;
  }

  return null;
}

function getOwn(obj, name) {
  return obj &&
    typeof obj === "object" &&
    hasOwn.call(obj, name) &&
    obj[name];
}

function mkdirp(rootDir, relativeDir) {
  const parentDir = path.dirname(relativeDir);
  if (parentDir === relativeDir) {
    return rootDir;
  }

  if (! mkdirp(rootDir, parentDir)) {
    return null;
  }

  const absoluteDir = path.join(rootDir, relativeDir);
  const stat = statOrNull(absoluteDir);
  if (stat && stat.isDirectory()) {
    return absoluteDir;
  }

  try {
    fs.mkdirSync(absoluteDir);
  } catch (e) {
    return null;
  }

  return absoluteDir;
}
