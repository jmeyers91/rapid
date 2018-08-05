describe('Rapid utils', () => {
  test('chunkByRunOrder should return an array of arrays with each inner array containing values with matching `runOrder` keys', () => {
    const chunkByRunOrder = require('../lib/utils/chunkByRunOrder');
    const testValues = [
      /* 0 */ { id: 1, runOrder: 1 },
      /* 1 */ { id: 2 },
      /* 2 */ { id: 3 },
      /* 3 */ { id: 4, runOrder: 2 },
      /* 4 */ { id: 5, runOrder: 3 },
      /* 5 */ { id: 6 },
      /* 6 */ { id: 7, runOrder: 1 },
      /* 7 */ { id: 8, runOrder: 3 },
      /* 8 */ { id: 9, runOrder: 2 }
    ];

    const expectedResult = [
      [testValues[0], testValues[6]],
      [testValues[3], testValues[8]],
      [testValues[4], testValues[7]],
      [testValues[1], testValues[2], testValues[5]]
    ];

    expect(chunkByRunOrder(testValues)).toEqual(expectedResult);
  });

  test('chunkedAsync should run values in a chunk in parallel and chunks in sequence', async () => {
    const chunkedAsync = require('../lib/utils/chunkedAsync');
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    let firstCounter = 0;
    let secondCounter = 0;
    let thirdCounter = 0;
    const fns = [
      [
        () =>
          wait(100).then(() => {
            firstCounter++;
            return '1 1';
          }),
        () =>
          wait(200).then(() => {
            firstCounter++;
            return '1 2';
          }),
        () =>
          wait(50).then(() => {
            firstCounter++;
            return '1 3';
          }),
        () =>
          wait(300).then(() => {
            firstCounter++;
            return '1 4';
          })
      ],

      [
        () =>
          wait(100).then(() => {
            secondCounter++;
            expect(firstCounter).toEqual(4);
            return '2 1';
          }),
        () =>
          wait(200).then(() => {
            secondCounter++;
            expect(firstCounter).toEqual(4);
            return '2 2';
          }),
        () =>
          wait(50).then(() => {
            secondCounter++;
            expect(firstCounter).toEqual(4);
            return '2 3';
          })
      ],

      [
        () =>
          wait(100).then(() => {
            thirdCounter++;
            expect(secondCounter).toEqual(3);
            return '3 1';
          }),
        () =>
          wait(200).then(() => {
            thirdCounter++;
            expect(secondCounter).toEqual(3);
            return '3 2';
          }),
        () =>
          wait(50).then(() => {
            thirdCounter++;
            expect(secondCounter).toEqual(3);
            return '3 3';
          })
      ]
    ];

    const results = await chunkedAsync(fns, fn => fn());
    expect(firstCounter).toEqual(4);
    expect(secondCounter).toEqual(3);
    expect(thirdCounter).toEqual(3);
    expect(results).toEqual([
      ['1 1', '1 2', '1 3', '1 4'],
      ['2 1', '2 2', '2 3'],
      ['3 1', '3 2', '3 3']
    ]);
  });
});
