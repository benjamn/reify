"use strict";module.export({check:()=>check});function check() {
  "use strict";var strictEqual;module.watch(require("assert"),{strictEqual:function(v){strictEqual=v}},0);var a,b,c;module.watch(require("../misc/abc"),{a:function(v){a=v},b:function(v){b=v},c:function(v){c=v}},1);




  strictEqual(a, "a")
  strictEqual(b, "b")
  strictEqual(c, "c")

  // Returns true only if the current function is strict.
  return function () {
    return ! this
  }()
}
