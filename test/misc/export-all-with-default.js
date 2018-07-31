module.link("./export-default.js", {
  // The Reify compiler never generates code that passes true to
  // module.makeNsSetter, but hand-written code can pass true to cause the
  // `default` property to be included in the copy.
  "*": module.makeNsSetter(true)
});
