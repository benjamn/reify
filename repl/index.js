"use strict";

const runtime = require("../lib/runtime");
runtime.enable(module.parent || __non_webpack_module__.parent);

module.exports = require("../node/index.js");
