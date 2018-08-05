const path = require('path');
const Rapid = require('../lib/Rapid');
const testProject = path.join(__dirname, 'testProject');
const createTestRapid = () => {
  return new Rapid(testProject)
    .clear()
    .migrate()
    .seed()
    .autoload();
};

const rapidTest = Rapid.test(createTestRapid);

module.exports = { rapidTest, testProject };
