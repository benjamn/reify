Object.defineProperties(exports, {
  safe: {
    enumerable: true,
    value: "safe"
  },

  unsafe: {
    enumerable: true,
    get() {
      throw new Error("unsafe");
    }
  }
});
