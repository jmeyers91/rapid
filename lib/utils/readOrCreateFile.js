const { exists, readFile, writeFile } = require('then-fs');
const { existsSync, readFileSync, writeFileSync } = require('then-fs');

module.exports = async function readOrCreateFile(path, defaultContentFn) {
  if(!await exists(path)) {
    const content = defaultContentFn ? defaultContentFn() : ''
    await writeFile(path, content, 'utf8');
    return content;
  } else {
    return readFile(path, 'utf8');
  }
};

module.exports.sync = function readOrCreateFileSync(path, defaultContentFn) {
  if(!existsSync(path)) {
    const content = defaultContentFn ? defaultContentFn() : ''
    writeFileSync(path, content, 'utf8');
    return content;
  } else {
    return readFileSync(path, 'utf8');
  }
};
