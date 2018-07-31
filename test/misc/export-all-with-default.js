module.link("./export-default.js", {
  // The compiler never generates `export * from ...` code that includes
  // the "default" property (per spec), but hand-written code can use "*+"
  // or module.makeNsSetter(true) to include the "default" property.
  "*": "*+"
});
