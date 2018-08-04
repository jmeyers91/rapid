// Runs fn on the values of each chunk in parallel, but processes the chunks in series
// ex. [[1,2], [3,4]] would run fn(1) and fn(2) in parallel
// but wouldn't start fn(3) and fn(4) until both fn(1) and fn(2) finished.
module.exports = async function chunkedAsync(chunks, fn) {
  const results = [];
  for (let chunk of chunks) {
    results.push(await Promise.all(chunk.map(fn)));
  }
  return results;
};
