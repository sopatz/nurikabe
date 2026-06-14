importScripts("puzzleGenerator.js");

self.onmessage = function(e) {
    const size = e.data.size;

    const puzzle = generateSolvedPuzzle(
        size,
        10000000
    );

    self.postMessage(puzzle);
};