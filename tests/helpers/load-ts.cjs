const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
function loadTs(relative, mocks = {}) {
  const filename = path.resolve(root, relative), localRequire = createRequire(filename);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  const requireMock = name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith('.') || name.startsWith('@/')) {
      const candidate = name.startsWith('@/') ? path.join(root, 'apps/web', name.slice(2)) : path.resolve(path.dirname(filename), name);
      for (const ext of ['.ts', '.tsx']) if (fs.existsSync(candidate + ext)) return loadTs(candidate + ext, mocks);
    }
    return localRequire(name);
  };
  vm.runInThisContext('(function(require,module,exports){' + code + '\n})', { filename })(requireMock, module, module.exports);
  return module.exports;
}
module.exports = { loadTs, root };
