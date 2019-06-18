#!/usr/bin/env bash

set -e
set -u

cd $(dirname "$0")
TEST_DIR=$(pwd)

# Make Node complain about deprecations more loudly.
export NODE_PENDING_DEPRECATION=1
export NODE_OPTIONS="--trace-warnings"

cd "$TEST_DIR"

rm -rf .cache
export REIFY_PARSER=babel

mocha \
    --require "../node" \
    --reporter spec \
    --full-trace \
    run.js

rm -rf .cache
export REIFY_PARSER=acorn

mocha \
    --require "../node" \
    --reporter spec \
    --full-trace \
    run.js

# Run tests again using test/.cache.
mocha \
    --require "../node" \
    --reporter spec \
    --full-trace \
    run.js
