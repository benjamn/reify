exports.name = module.id;

exports.setName = function (newName) {
  module.runSetters(exports.name = newName);
};

Object.seal(exports);

