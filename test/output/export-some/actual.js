export { a, b as v } from "./abc";

import { c as cee } from "./abc.js";

export { cee as si, c };

function c() {
  return "c";
}
