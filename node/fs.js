"use strict";

const fs = require("fs");
const path = require("path");
const utils = require("../lib/utils.js");
const zlib = require("zlib");

const FastObject = require("../lib/fast-object.js");

let pendingWriteTimer = null;
const pendingWrites = new FastObject;

function fallbackIsDirectory(filePath) {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch (e) {}
  return false;
}

function fallbackMtime(filePath) {
  try {
    return fs.statSync(filePath).mtime.getTime();
  } catch (e) {}
  return -1;
}

function fallbackReadFile(filePath, options) {
  try {
    return fs.readFileSync(filePath, options);
  } catch (e) {}
  return null;
}

function streamToBuffer(stream, bufferOrString) {
  const result = [];
  stream.on("data", chunk => result.push(chunk)).end(bufferOrString);
  return Buffer.concat(result);
}

function isDirectory(thepath) {
  return fallbackIsDirectory(thepath);
}

exports.isDirectory = isDirectory;

function mkdir(dirPath) {
  try {
    fs.mkdirSync(dirPath);
    return true;
  } catch (e) {}
  return false;
}

exports.mkdir = mkdir;

function mkdirp(dirPath, scopePath) {
  const parentPath = path.dirname(dirPath);
  if (dirPath === parentPath || dirPath === scopePath) {
    return true;
  }
  if (mkdirp(parentPath, scopePath)) {
    return isDirectory(dirPath) || mkdir(dirPath);
  }
  return false;
}

exports.mkdirp = mkdirp;

function mtime(filePath) {
  return fallbackMtime(filePath);
}

exports.mtime = mtime;

function readdir(dirPath) {
  try {
    return fs.readdirSync(dirPath);
  } catch (e) {}
  return null;
}

exports.readdir = readdir;

function readFile(filePath, options) {
  return fallbackReadFile(filePath, options);
}

exports.readFile = readFile;

function readJSON(filePath) {
  const content = readFile(filePath, "utf8");
  return content === null ? content : JSON.parse(content);
}

exports.readJSON = readJSON;

function writeFile(filePath, bufferOrString, options) {
  try {
    fs.writeFileSync(filePath, bufferOrString, options);
    return true;
  } catch (e) {}
  return false;
}

exports.writeFile = writeFile;

function writeFileDefer(filePath, content, options) {
  options = Object.assign({}, options);
  pendingWrites[filePath] = { content, options };

  if (pendingWriteTimer !== null) {
    return;
  }
  pendingWriteTimer = setImmediate(() => {
    pendingWriteTimer = null;
    Object.keys(pendingWrites).forEach((filePath) => {
      const pending = pendingWrites[filePath];

      if (mkdirp(path.dirname(filePath), pending.options.scopePath)) {
        const content = typeof pending.content === "function"
          ? pending.content()
          : pending.content;

        if (writeFile(filePath, content, pending.options)) {
          delete pendingWrites[filePath];
        }
      }
    });
  });
}

exports.writeFileDefer = writeFileDefer;
