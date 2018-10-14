// Used to ensure the run order of modules that are loaded dynamically (ex. seeds, hooks)

// Takes an array of objects, groups them into arrays by their `runOrder` key
// then sorts the groups by `runOrder` and returns the array of sorted arrays.
// If the `runOrder` key is null/undefined, `defaultRunOrder` is used.

const identity = require('lodash/identity');
const defaultRunOrder = 99999999;

module.exports = function chunkByRunOrder(values) {
  return Array.from(
    values
      .filter(identity)
      .reduce((groups, value) => {
        const runOrder = getRunOrder(value);
        if (groups.has(runOrder)) groups.get(runOrder).push(value);
        else groups.set(runOrder, [value]);
        return groups;
      }, new Map())
      .entries(),
  )
    .sort(([a], [b]) => a - b)
    .map(([, /* runOrder */ values]) => values);
};

function getRunOrder(value) {
  if (value.runOrder == null) return defaultRunOrder;
  return value.runOrder;
}
