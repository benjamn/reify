import assert from "assert";
import { compile } from "../lib/compiler.js";

function isUseStrictExprStmt(stmt) {
  return stmt.type === "ExpressionStatement" &&
    stmt.expression.value === "use strict";
}

describe("compiler", () => {
  it("should not get confused by string literals", () => {
    assert.strictEqual(
      'a; import b from "c"; d',
      "a; import b " + 'from "c"; d'
    );

    assert.strictEqual(
      'a; export {a} from "a"; b;',
      "a; export {a" + '} from "a"; b;'
    );
  });

  it("should not be enabled for nested node_modules", () => {
    let error;

    try {
      import "disabled";
    } catch (e) {
      error = e;
    }

    assert.ok(error instanceof SyntaxError);
    assert.ok(/unexpected/i.test(error.message));
  });

  it("should be enabled for packages that depend on reify", () => {
    import a from "enabled";
    assert.strictEqual(a, assert);
  });

  it("should preserve line numbers", () => {
    import check from "./compiler/lines.js";
    check();
  });

  it('should not hoist above "use strict"', () => {
    import { check } from "./compiler/strict";
    assert.strictEqual(check(), true);
  });

  it("should transform AST when options.ast truthy", () => {
    function isVarDecl(node, names) {
      assert.strictEqual(node.type, "VariableDeclaration");
      assert.deepEqual(node.declarations.map((decl) => decl.id.name), names);
    }

    function isCallExprStmt(node, objectName, propertyName) {
      assert.strictEqual(node.type, "ExpressionStatement");
      assert.strictEqual(node.expression.type, "CallExpression");
      assert.strictEqual(
        node.expression.callee.object.name, objectName);
      assert.strictEqual(
        node.expression.callee.property.name, propertyName);
    }

    const code = [
      "console.log(foo, bar);",
      'import foo from "./foo"',
      'import bar from "./bar"',
      "export default foo + bar;"
    ].join("\n");

    const result = compile(code, { ast: true });
    let ast = result.ast;

    if (ast.type === "File") {
      ast = ast.program;
    }

    assert.strictEqual(ast.type, "Program");

    const firstIndex = isUseStrictExprStmt(ast.body[0]) ? 1 : 0;
    assert.strictEqual(ast.body.length - firstIndex, 6);

    isVarDecl(ast.body[firstIndex + 0], ["foo"]);
    isCallExprStmt(ast.body[firstIndex + 1], "module", "link");
    isVarDecl(ast.body[firstIndex + 2], ["bar"]);
    isCallExprStmt(ast.body[firstIndex + 3], "module", "link");
    isCallExprStmt(ast.body[firstIndex + 4], "console", "log");
    isCallExprStmt(ast.body[firstIndex + 5], "module", "exportDefault");
  });

  it("should respect options.enforceStrictMode", () => {
    const source = 'import "a"';

    const withoutStrict = compile(source, {
      enforceStrictMode: false
    }).code;

    assert.ok(! withoutStrict.startsWith('"use strict"'));

    const withStrict = compile(source, {
      enforceStrictMode: true
    }).code;

    assert.ok(withStrict.startsWith('"use strict"'));

    // No options.enforceStrictMode is the same as
    // { enforceStrictMode: true }.
    const defaultStrict = compile(
      source
    ).code;

    assert.ok(defaultStrict.startsWith('"use strict"'));
  });

  it("should always generate arrow functions", () => {
    assert.ok(compile([
      'import def from "mod"',
      "export { def as x }"
    ].join("\n")).code.includes("=>"));
  });

  it("should respect options.generateLetDeclarations", () => {
    const source = 'import foo from "./foo"';

    const withLet = compile(source, {
      generateLetDeclarations: true
    }).code;

    assert.ok(withLet.startsWith('"use strict";let foo;'));

    const withoutLet = compile(source, {
      generateLetDeclarations: false
    }).code;

    assert.ok(withoutLet.startsWith('"use strict";var foo;'));

    // No options.generateLetDeclarations is the same as
    // { generateLetDeclarations: false }.
    const defaultLet = compile(
      source
    ).code;

    assert.ok(defaultLet.startsWith('"use strict";var foo;'));
  });

  it("should respect options.avoidModernSyntax", () => {
    const source = [
      'import foo from "./foo";',
      'export { foo as bar };',
      'const fooPlusOne = foo + 1;',
      'export default fooPlusOne;',
    ].join("\n");

    const legacy = compile(source, {
      avoidModernSyntax: true
    }).code;

    assert.strictEqual(legacy, [
      '"use strict";module.export({bar:function(){return foo}});var foo;module.link("./foo",{default:function(v){foo=v}},0);',
      "",
      "const fooPlusOne = foo + 1;",
      "module.exportDefault(fooPlusOne);",
    ].join("\n"));

    const legacyIgnoresLetOption = compile(source, {
      avoidModernSyntax: true,
      // Ignored because let declarations are "modern" syntax.
      generateLetDeclarations: true
    }).code;
    assert.strictEqual(legacy, legacyIgnoresLetOption);

    const modernImplicit = compile(source, {
      generateLetDeclarations: true
    }).code;

    const modernExplicit = compile(source, {
      generateLetDeclarations: true,
      avoidModernSyntax: false
    }).code;

    assert.strictEqual(modernImplicit, modernExplicit);
    assert.strictEqual(modernExplicit, [
      '"use strict";module.export({bar:()=>foo});let foo;module.link("./foo",{default(v){foo=v}},0);',
      "",
      "const fooPlusOne = foo + 1;",
      "module.exportDefault(fooPlusOne);",
    ].join("\n"));

    const modernWithoutLet = compile(source, {
      avoidModernSyntax: false
    }).code;

    assert.strictEqual(modernWithoutLet, [
      '"use strict";module.export({bar:()=>foo});var foo;module.link("./foo",{default(v){foo=v}},0);',
      "",
      "const fooPlusOne = foo + 1;",
      "module.exportDefault(fooPlusOne);",
    ].join("\n"));
  });

  it("should allow pre-parsed ASTs via options.parse", () => {
    import { parse } from "../lib/parsers/default.js";

    const code = 'import foo from "./foo"';
    const ast = parse(code);
    const illegal = code.replace(/\bfoo\b/g, "+@#");
    const result = compile(illegal, {
      generateLetDeclarations: true,
      // If you really want to avoid parsing, you can provide an
      // options.parse function that returns whatever AST you like.
      parse: () => ast
    });

    assert.strictEqual(result.ast, null);
    assert.ok(result.code.startsWith('"use strict";let foo'));
    assert.ok(result.code.includes('"./+@#"'));
  });

  it("should respect options.sourceType", () => {
    const source = "1+2;";

    const moduleType = compile(source, {
      sourceType: "module"
    }).code;

    assert.ok(moduleType.startsWith('"use strict"'));

    const unambiguousAsCJS = compile(source, {
      sourceType: "unambiguous"
    }).code;

    assert.ok(! unambiguousAsCJS.startsWith('"use strict"'));

    const unambiguousAsESM = compile('import "a"\n' + source, {
      sourceType: "unambiguous"
    }).code;

    assert.ok(unambiguousAsESM.startsWith('"use strict"'));

    const scriptType = compile('import "a"\n' + source, {
      sourceType: "script"
    }).code;

    assert.ok(scriptType.startsWith('import "a"'));

    // No options.sourceType is the same as
    // { sourceType: "unambiguous" }.
    const defaultType = compile(
      source
    ).code;

    assert.ok(! defaultType.startsWith('"use strict"'));
  });

  it("should transform default export declaration to expression", () => {
    function parse(code) {
      const result = compile(code, { ast: true });
      let ast = result.ast;

      if (ast.type === "File") {
        ast = ast.program;
      }

      assert.strictEqual(ast.type, "Program");

      return ast;
    }

    const anonCode = "export default class {}";
    const anonAST = parse(anonCode);

    const anonFirstIndex =
      isUseStrictExprStmt(anonAST.body[0]) ? 1 : 0;

    assert.strictEqual(anonAST.body.length - anonFirstIndex, 1);
    assert.strictEqual(
      anonAST.body[anonFirstIndex].expression.arguments[0].type,
      "ClassExpression"
    );

    const namedCode = "export default class C {}";
    const namedAST = parse(namedCode);

    const namedFirstIndex =
      isUseStrictExprStmt(namedAST.body[0]) ? 1 : 0;

    assert.strictEqual(namedAST.body.length - namedFirstIndex, 2);
    assert.strictEqual(
      namedAST.body[namedFirstIndex + 1].type,
      "ClassDeclaration"
    );
  });

  it("should not get confused by shebang", () => {
    const code = [
      "#!/usr/bin/env node -r reify",
      'import foo from "./foo"',
    ].join("\n");

    const withShebang = compile(code).code;
    assert.ok(withShebang.startsWith('"use strict";var foo'));
  });

  it("should preserve crlf newlines", () => {
    const code = [
      "import {",
      "  strictEqual,",
      "  // blank line",
      "  deepEqual",
      "}",
      'from "assert";'
    ].join("\r\n");

    const result = compile(code).code;
    assert.ok(result.endsWith("\r\n".repeat(5)));
  });

  it("should compile dynamic import(...)", () => {
    function check(optionValue, source, expected) {
      assert.strictEqual(
        compile(source, {
          enforceStrictMode: false,
          dynamicImport: optionValue
        }).code,
        expected
      );
    }

    check(
      void 0,
      "import(x)",
      "import(x)"
    );

    check(
      false,
      "import(x)",
      "import(x)"
    );

    check(
      true,
      "import(x)",
      "module.dynamicImport(x)"
    );

    check(
      "dynamicImport",
      "import(x)",
      "module.dynamicImport(x)"
    );

    check(
      "_import",
      "import(x)",
      "module._import(x)"
    );

    check(
      true,
      "import (x)",
      "module.dynamicImport (x)"
    );

    check(
      true,
      [
        "import(function () {",
        "  return getId();",
        "}())",
      ].join("\n"),
      [
        "module.dynamicImport(function () {",
        "  return getId();",
        "}())",
      ].join("\n")
    );

    check(true, [
      "import(",
      "  id",
      ")",
    ].join("\n"), [
      "module.dynamicImport(",
      "  id",
      ")",
    ].join("\n"));

    check(
      true,
      "import(`\nid\n`)",
      "module.dynamicImport(`\nid\n`)"
    );
  });
});
