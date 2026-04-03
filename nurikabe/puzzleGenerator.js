const SIZE = 9;
//let board = "#################################################################################".split(""); // 81 chars, all split up
let board = "6     ##########1#2 # # 2##### ###4## # #   ##2# #######7 #   5#1# # ########## 2".split("");

// Get string index for certain row and column of tile
function index(row, col) {
    return row * SIZE + col;
}

// Return the value of a tile using row and column
function getCell(board, row, col) {
    return board[index(row, col)];
}

// Set the value of a tile to a certain value
function setCell(board, row, col, value) {
    board[index(row, col)] = value;
}

// Turn 1-D array back into string to feed into rest of program
function toString(board) {
    return board.join("");
}

// Make sure input row and column is within the bounds of the board
function inBounds(row, col) {
    return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

// Get each neighbor of a tile
function getNeighbors(row, col) {
    const neighbors = [
        [row - 1, col],
        [row + 1, col],
        [row, col - 1],
        [row, col + 1],
    ];

    return neighbors.filter(([r, c]) => inBounds(r, c));
}

// Get string indices of a cell's neighbors
function getNeighborIndices(row, col) {
    return getNeighbors(row, col).map(([r, c]) => index(r, c));
}

// Check if there are any 2x2 areas of water on the board
function has2x2Water(board) {
    // loop through every cell except right column and bottom row
    for (let row = 0; row < SIZE - 1; row++) {
        for (let col = 0; col < SIZE - 1; col++) {
            if (
                getCell(board, row, col) === "#" &&  // check if current cell is water
                getCell(board, row, col + 1) === "#" &&  // check if cell to the right of current cell is water
                getCell(board, row + 1, col) === "#" &&  // check if cell below the current cell is water
                getCell(board, row + 1, col + 1) === "#"  // check if cell diagonally down-right of current cell is water
            ) {
                return true;
            }
        }
    }
    // Checked through all cells and there's no 2x2 water yayyyy
    return false;
}

// Check if all the water on the board is connected
function isWaterConnected(board) {
    let firstWater = null;
    let totalWater = 0;  // will hold count of water tiles

    // Count every water tile on the board
    for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
            if (getCell(board, row, col) === "#") {
                totalWater++;
                if (firstWater === null) {
                    firstWater = [row, col];
                }
            }
        }
    }

    // No water on entire board (shouldn't happen, but just in case)
    if (firstWater === null) {
        return true;
    }

    // Flood fill water from first water 
    const connectedWater = floodFillWater(board, firstWater[0], firstWater[1]);
    return connectedWater.length === totalWater;
}

function floodFillWater(board, firstWaterRow, firstWaterCol) {
    const stack = [[firstWaterRow, firstWaterCol]];  // stack containing first water position to keep track of cells we still need to explore
    const visited = new Set();  // set to remember cells that have already been processed
    const waterCells = [];  // array to store all water cells found by flood fill

    // loop as long as there are still cells to explore
    while (stack.length > 0) {
        // Pop a cell off the stack to be examined
        const [row, col] = stack.pop();
        // Get index of current cell so it can be stored in the "visited" set
        const key = index(row, col);

        // If this cell has already been processed, skip it and move on
        if (visited.has(key)) continue;
        // If current cell is not water, skip it and move on
        if (getCell(board, row, col) !== "#") continue;

        // Mark current water cell as visited
        visited.add(key);
        // Add current water cell to the list of connected water cells
        waterCells.push([row, col]);

        // Get all neighbors of current cell
        for (const [neighRow, neighCol] of getNeighbors(row, col)) {
            // Check whether neighbor is water
            if (getCell(board, neighRow, neighCol) === "#") {
                // Push water neighbor to stack to be explored
                stack.push([neighRow, neighCol]);
            }
        }
    }

    return waterCells;
}

// Quick helper since ' ' or a number can be land
function isLand(cell) {
    return cell !== "#";
}

function getLandRegions(board) {
    const visited = new Set();
    const islands = [];

    for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
            const key = index(row, col);

            if (visited.has(key)) continue;
            if (!isLand(getCell(board, row, col))) continue;

            // Get arrays of [row, col] cells making up an island
            const island = floodFillLand(board, row, col);
            islands.push(island);

            // Add all tiles of found island to visited set
            for (const [r, c] of island) {
                visited.add(index(r, c));
            }
        }
    }

    return islands;
}

// Same as water fill, but for land instead of water
// Finds indices of a single island
function floodFillLand(board, startRow, startCol) {
    const stack = [[startRow, startCol]];
    const visited = new Set();
    const landCells = [];

    while (stack.length > 0) {
        const [row, col] = stack.pop();
        const key = index(row, col);

        if (visited.has(key)) continue;
        if (!isLand(getCell(board, row, col))) continue;

        visited.add(key);
        landCells.push([row, col]);

        for (const [neighRow, neighCol] of getNeighbors(row, col)) {
            if (isLand(getCell(board, neighRow, neighCol))) {
                stack.push([neighRow, neighCol]);
            }
        }
    }

    return landCells;
}

function isClue(cell) {
    return /^[1-9a-f]$/i.test(cell);
}

function clueToNumber(cell) {
    if (!isClue(cell)) return null;
    return parseInt(cell, 16);
}

// Finds number of clue squares in island to make sure there is only 1
function countCluesInIsland(board, island) {
    let count = 0;
    for (const [row, col] of island) {
        if (isClue(getCell(board, row, col))) {
            count++;
        }
    }
    return count;
}

// Get the clue number value from the island's clue
function getClueValueInIsland(board, island) {
    // Check every cell in island for one with a value
    for (const [row, col] of island) {
        const cell = getCell(board, row, col);
        const value = clueToNumber(cell);
        if (value !== null) {
            return value;
        }
    }
    return null;
}

function islandToIndexSet(region) {
    const cells = new Set();
    for (const [row, col] of region) {
        cells.add(index(row, col));
    }
    return cells;
}

// Check if island cell touches another island's clue tile
function touchesOtherClue(board, region) {
    const islandCells = islandToIndexSet(region);
    for (const [row, col] of region) {
        for (const [neighRow, neighCol] of getNeighbors(row, col)) {
            const neighborIndex = index(neighRow, neighCol);

            if (islandCells.has(neighborIndex)) continue;

            if (isClue(getCell(board, neighRow, neighCol))) {
                return true;
            }
        }
    }
    return false;
}

function getIslandContainingCell(board, row, col) {
    if (!isLand(getCell(board, row, col))) return null;
    return floodFillLand(board, row, col);
}

// Count number of cells an unfinished island can expand into
function countExpandableNeighbors(board, island) {
    const islandCells = islandToIndexSet(island);
    const frontier = new Set();

    for (const [row, col] of island) {
        for (const [neighRow, neighCol] of getNeighbors(row, col)) {
            const neighborKey = index(neighRow, neighCol);
            if (islandCells.has(neighborKey)) continue;

            const cell = getCell(board, neighRow, neighCol);

            if (cell === "#") {
                frontier.add(neighborKey);
            }
        }
    }

    return frontier.size;
}

// Check if land can be placed at input cell
function canPlaceLand(board, row, col) {
    const cell = getCell(board, row, col);

    if (cell !== "#") return true;

    const nextBoard = [...board];
    setCell(nextBoard, row, col, " ");

    const island = getIslandContainingCell(nextBoard, row, col);
    const clueCount = countCluesInIsland(nextBoard, island);

    if (clueCount !== 1) return false;

    const clueValue = getClueValueInIsland(nextBoard, island);
    if (island.length > clueValue) return false;

    return true;
}

// Check if water can be placed at input cell
function canPlaceWater(board, row, col) {
    const cell = getCell(board, row, col);

    if (cell === "#") return true;
    if (isClue(cell)) return false;

    const nextBoard = [...board];
    setCell(nextBoard, row, col, "#");

    if (has2x2Water(nextBoard)) return false;

    const islands = getLandRegions(nextBoard);

    for (const island of islands) {
        const clueCount = countCluesInRegion(nextBoard, island);

        if (clueCount > 1) return false;
        if (clueCount === 0) return false;

        const clueValue = getClueValueInRegion(nextBoard, island);

        if (island.length > clueValue) return false;

        const spaceLeft = clueValue - island.length;
        const expandable = countExpandableNeighbors(nextBoard, island);

        if (expandable < spaceLeft) return false;
    }

    return true;
}




//------------------------------------------------------

// setCell(board, 0, 0, '6');
// console.log(getCell(board, 2, 1))
// console.log(getNeighborIndexes(0, 0))
console.log(getLandRegions(board));
//console.log(board);

//console.log(toString(board));