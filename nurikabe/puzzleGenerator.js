function makeConfig(size) {
    const config = {
        size,
        cellCount: size * size,
        landRange: getLandRange(size),
        maxIslandSize: getMaxIslandSize(size),
        maxOneClues: getMaxOneClues(size),
    };
    config.water2x2Masks = get2x2Masks(config);
    return config;
}

function getLandRange(size) {
    const known = {
        7: [16, 26],
        9: [24, 42],
        11: [44, 56],
    };

    if (known[size]) return known[size];

    const cells = size * size;
    return [
        Math.round(cells * 0.32),
        Math.round(cells * 0.50),
    ];
}

function getMaxOneClues(size) {
    const known = {
        7: 4,
        9: 5,
        11: 12,
    };

    if (known[size]) return known[size];

    return Math.max(4, Math.round(size * 0.75));
}

// Get string index for certain row and column of tile
function index(config, row, col) {
    return row * config.size + col;
}

// Return the value of a tile using row and column
function getCell(config, board, row, col) {
    return board[index(config, row, col)];
}

// Turn 1-D array back into string to feed into rest of program
function toString(board) {
    return board.join("");
}

function getMaxIslandSize(size) {
    const known = {
        7: 9,
        9: 9,
        11: 13,
    };

    if (known[size]) return known[size];

    return Math.max(9, Math.round(size * 1.2));
}

// Turn puzzle solution string into puzzle starting string
function solutionToStarting(solpuz) {
    let puzzle = [];
    for (let index = 0; index < solpuz.length; index++) {
        if (solpuz[index] === ' ' || solpuz[index] === '#') {
            puzzle[index] = '.';
        }
        else puzzle[index] = solpuz[index];
    }
    return toString(puzzle);
}

// Make sure input row and column is within the bounds of the board
function inBounds(config, row, col) {
    return row >= 0 && row < config.size && col >= 0 && col < config.size;
}

// Get each neighbor of a tile
function getNeighbors(config, row, col) {
    const neighbors = [
        [row - 1, col],
        [row + 1, col],
        [row, col - 1],
        [row, col + 1],
    ];

    return neighbors.filter(([r, c]) => inBounds(config, r, c));
}

// Get string indices of a cell's neighbors
function getNeighborIndices(config, row, col) {
    return getNeighbors(config, row, col).map(([r, c]) => index(config, r, c));
}

// Check if there are any 2x2 areas of water on the board
function has2x2Water(config, board) {
    // loop through every cell except right column and bottom row
    for (let row = 0; row < config.size - 1; row++) {
        for (let col = 0; col < config.size - 1; col++) {
            if (
                getCell(config, board, row, col) === "#" &&  // check if current cell is water
                getCell(config, board, row, col + 1) === "#" &&  // check if cell to the right of current cell is water
                getCell(config, board, row + 1, col) === "#" &&  // check if cell below the current cell is water
                getCell(config, board, row + 1, col + 1) === "#"  // check if cell diagonally down-right of current cell is water
            ) {
                return true;
            }
        }
    }
    // Checked through all cells and there's no 2x2 water yayyyy
    return false;
}

// Check if all the water on the board is connected
function isWaterConnected(config, board) {
    let firstWater = null;
    let totalWater = 0;  // will hold count of water tiles

    // Count every water tile on the board
    for (let row = 0; row < config.size; row++) {
        for (let col = 0; col < config.size; col++) {
            if (getCell(config, board, row, col) === "#") {
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
    const connectedWater = floodFillWater(config, board, firstWater[0], firstWater[1]);
    return connectedWater.length === totalWater;
}

// Helper used in water connected check
function floodFillWater(config, board, firstWaterRow, firstWaterCol) {
    const stack = [[firstWaterRow, firstWaterCol]];  // stack containing first water position to keep track of cells we still need to explore
    const visited = new Set();  // set to remember cells that have already been processed
    const waterCells = [];  // array to store all water cells found by flood fill

    // loop as long as there are still cells to explore
    while (stack.length > 0) {
        // Pop a cell off the stack to be examined
        const [row, col] = stack.pop();
        // Get index of current cell so it can be stored in the "visited" set
        const key = index(config, row, col);

        // If this cell has already been processed, skip it and move on
        if (visited.has(key)) continue;
        // If current cell is not water, skip it and move on
        if (getCell(config, board, row, col) !== "#") continue;

        // Mark current water cell as visited
        visited.add(key);
        // Add current water cell to the list of connected water cells
        waterCells.push([row, col]);

        // Get all neighbors of current cell
        for (const [neighRow, neighCol] of getNeighbors(config, row, col)) {
            // Check whether neighbor is water
            if (getCell(config, board, neighRow, neighCol) === "#") {
                // Push water neighbor to stack to be explored
                stack.push([neighRow, neighCol]);
            }
        }
    }

    return waterCells;
}

// Helper for land checking
function isLand(cell) {
    return cell === " " || isClue(cell);  // ' ' or a number clue can be land
}

// Same as water fill, but for land instead of water
// Finds indices of a single island
function floodFillLand(config, board, startRow, startCol) {
    const stack = [[startRow, startCol]];
    const visited = new Set();
    const landCells = [];

    while (stack.length > 0) {
        const [row, col] = stack.pop();
        const key = index(config, row, col);

        if (visited.has(key)) continue;
        if (!isLand(getCell(config, board, row, col))) continue;

        visited.add(key);
        landCells.push([row, col]);

        for (const [neighRow, neighCol] of getNeighbors(config, row, col)) {
            if (isLand(getCell(config, board, neighRow, neighCol))) {
                stack.push([neighRow, neighCol]);
            }
        }
    }

    return landCells;
}

function getLandRegions(config, board) {
    const visited = new Set();
    const islands = [];

    for (let row = 0; row < config.size; row++) {
        for (let col = 0; col < config.size; col++) {
            const key = index(config, row, col);

            if (visited.has(key)) continue;
            if (!isLand(getCell(config, board, row, col))) continue;

            // Get arrays of [row, col] cells making up an island
            const island = floodFillLand(config, board, row, col);
            islands.push(island);

            // Add all tiles of found island to visited set
            for (const [r, c] of island) {
                visited.add(index(config, r, c));
            }
        }
    }

    return islands;
}

function isClue(cell) {
    return /^[1-9a-f]$/i.test(cell);
}

function clueToNumber(cell) {
    if (!isClue(cell)) return null;
    return parseInt(cell, 16);
}

// Finds number of clue squares in island to make sure there is only 1
function countCluesInIsland(config, board, island) {
    let count = 0;
    for (const [row, col] of island) {
        if (isClue(getCell(config, board, row, col))) {
            count++;
        }
    }
    return count;
}

// Get the clue number value from the island's clue
function getClueValueInIsland(config, board, island) {
    // Check every cell in island for one with a value
    for (const [row, col] of island) {
        const cell = getCell(config, board, row, col);
        const value = clueToNumber(cell);
        if (value !== null) {
            return value;
        }
    }
    return null;
}

function rowOf(config, cellIndex) {
    return Math.floor(cellIndex / config.size);
}

function colOf(config, cellIndex) {
    return cellIndex % config.size;
}

function getNeighborCellIndices(config, cellIndex) {
    return getNeighborIndices(config, rowOf(config, cellIndex), colOf(config, cellIndex));
}

// Make sure board is correct size and does not contain invalid characters
function isValidBoardShape(config, board) {
    if (board.length !== config.size * config.size) return false;  // Ensure board size is correct

    // Ensure board only contains valid characters
    for (const cell of board) {
        if (cell !== "#" && cell !== " " && !isClue(cell)) {
            return false;
        }
    }

    return true;  // we all good :)
}

// Validator to check if a finished board is a valid nurikabe puzzle
function isValidFinishedBoard(config, board) {
    if (!isValidBoardShape(config, board)) return false;  // make sure board size and characters are valid
    if (has2x2Water(config, board)) return false;  // make sure there are no 2x2 pockets of water
    if (!isWaterConnected(config, board)) return false;  // make sure all the water is connected

    const islands = getLandRegions(config,  board);  // gather the groups of indices for each island on the board

    for (const island of islands) {
        // Make sure each island has just 1 clue square
        const clueCount = countCluesInIsland(config, board, island);
        if (clueCount !== 1) return false;

        // Make sure the clue value is the correct number for the island size
        const clueValue = getClueValueInIsland(config, board, island);
        if (island.length !== clueValue) return false;
    }

    return true;  // yay we have a valid board woohoo
}

// Make array of config.size * config.size single character strings full of '#'
function makeEmptyBoard(config) {
    return Array(config.size * config.size).fill("#");
}

// Place island at certain indices of puzzle string
function placeIslandWithClue(board, cells, clueIndex, clueValue) {
    for (const cellIndex of cells) {
        board[cellIndex] = " ";
    }
    board[clueIndex] = clueValue.toString(16).toUpperCase();
}

function chooseBestCluePositions(config, islands) {
    let cluePositions = islands.map(island => island[0]);

    // Do a few passes because clue choices affect each other
    for (let pass = 0; pass < 1; pass++) {
        const clueBoard = Array(config.size * config.size).fill(".");

        for (let i = 0; i < islands.length; i++) {
            clueBoard[cluePositions[i]] = islands[i].length.toString(16).toUpperCase();
        }

        for (let islandIndex = 0; islandIndex < islands.length; islandIndex++) {
            const island = islands[islandIndex];

            if (island.length === 1) {
                cluePositions[islandIndex] = island[0];
                continue;
            }

            let bestCell = cluePositions[islandIndex];
            let bestShapeCount = Infinity;

            for (const candidateCell of island) {
                const testBoard = [...clueBoard];
                testBoard[cluePositions[islandIndex]] = ".";
                testBoard[candidateCell] = island.length.toString(16).toUpperCase();

                const shapeCount = generateIslandShapesForClue(
                    config, 
                    testBoard,
                    candidateCell,
                    island.length,
                    100
                ).length;

                if (shapeCount < bestShapeCount) {
                    bestShapeCount = shapeCount;
                    bestCell = candidateCell;
                }
            }

            cluePositions[islandIndex] = bestCell;
        }
    }

    return cluePositions;
}

// Check if land (island) square can be placed at given index
function canPlaceIslandCell(config, board, islandCells, cellIndex) {
    // Make sure the cell exists on the board
    if (cellIndex < 0 || cellIndex >= config.size * config.size) return false;

    // Can only grow an island into water
    if (board[cellIndex] !== "#") return false;

    const islandSet = new Set(islandCells);
    const neighbors = getNeighborCellIndices(config, cellIndex);

    // If this island already has cells, the new cell must touch it
    if (islandCells.length > 0) {
        let touchesIsland = false;

        // Check all neighbors of cell to be added to island to see if it touches island
        for (const neighborIndex of neighbors) {
            if (islandSet.has(neighborIndex)) {
                touchesIsland = true;  // yay new cell touches island :)
                break;
            }
        }

        if (!touchesIsland) return false;  // Cell can't be added to island :(
    }

    // The new cell cannot touch land from a different island
    for (const neighborIndex of neighbors) {
        if (islandSet.has(neighborIndex)) continue;

        // Check if cell has land neighbors that are from a different island than the one currently being checked
        if (isLand(board[neighborIndex])) {
            return false;
        }
    }

    return true;
}

// Get all neighboring water cells this island is allowed to grow into
function getIslandGrowthCandidates(config, board, islandCells) {
    const candidates = new Set();

    // If the island has no cells yet, any valid water cell could be its start
    if (islandCells.length === 0) {
        for (let cellIndex = 0; cellIndex < config.size * config.size; cellIndex++) {
            if (canPlaceIslandCell(config, board, islandCells, cellIndex)) {
                candidates.add(cellIndex);
            }
        }

        return [...candidates];
    }

    // If the island already exists, gather all valid neighboring water cells of island as growth candidates
    for (const cellIndex of islandCells) {
        for (const neighborIndex of getNeighborCellIndices(config, cellIndex)) {
            if (canPlaceIslandCell(config, board, islandCells, neighborIndex)) {
                candidates.add(neighborIndex);
            }
        }
    }

    return [...candidates];
}

// Helper function to choose one random item from array
function randomChoice(items) {
    if (items.length === 0) return null;
    return items[Math.floor(Math.random() * items.length)];
}

// Create one island of given size
function growIsland(config, board, startCellIndex, targetSize) {
    const islandCells = [];

    // Make sure first cell can be placed
    if (!canPlaceIslandCell(config, board, islandCells, startCellIndex)) {
        return null;
    }

    // Mark starting cell as land (the first of its island, yayy)
    islandCells.push(startCellIndex);
    board[startCellIndex] = " ";

    // Repeatedly add growth candidates until target island size is reached
    while (islandCells.length < targetSize) {
        // Get island's current growth candidates (valid water neighbors)
        const candidates = getIslandGrowthCandidates(config, board, islandCells);

        // If there is nowhere to grow, the island generation fails and each cell is set back to water
        if (candidates.length === 0) {
            for (const cellIndex of islandCells) {
                board[cellIndex] = "#";
            }
            return null;
        }

        // Choose random candidate to be the next cell added to island 
        const nextCell = randomChoice(candidates);

        // Add randomly seelcted candidate cell to island
        islandCells.push(nextCell);
        board[nextCell] = " ";
    }

    return islandCells;
}

function growIslandWithRetries(config, board, startCellIndex, targetSize, attempts = 8) {
    for (let attempt = 0; attempt < attempts; attempt++) {
        const island = growIsland(config, board, startCellIndex, targetSize);
        if (island !== null) return island;
    }

    return null;
}

function getGrowAttemptsForSize(size) {
    if (size >= 8) return 10;
    if (size >= 6) return 7;
    if (size >= 4) return 4;
    return 2;
}

function orderIslandSizesForPlacement(sizes) {
    const large = sizes.filter(size => size >= 6);
    const medium = sizes.filter(size => size >= 3 && size <= 5);
    const small = sizes.filter(size => size <= 2);

    return [
        ...shuffle(large),
        ...shuffle(medium),
        ...shuffle(small),
    ];
}

// Return a shuffled copy of an array
function shuffle(items) {
    const shuffled = [...items];  // create copy so we don't mess with the original array
    for (let i = shuffled.length - 1; i > 0; i--) {  // walk backwards thru array
        // Pick a random index from 0 to i
        const j = Math.floor(Math.random() * (i + 1));
        // Swap values at positions i and j
        const temp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = temp;
    }
    return shuffled;  // reutrn new mixed array
}

// Get the indices of every water cell on the board
function getAllWaterCellIndices(config, board) {
    const waterCells = [];
    for (let cellIndex = 0; cellIndex < config.size * config.size; cellIndex++) {
        if (board[cellIndex] === "#") {
            waterCells.push(cellIndex);
        }
    }
    return waterCells;
}

// Choose random number between 2 numbers on a bell curve
function randomBellCurveInt(min, max) {
    let u = 0, v = 0;
    // Box-Muller transform to get a value from a standard normal distribution
    while(u === 0) u = Math.random(); // Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);

    // Standard deviation adjustment: 
    // Dividing by 6.0 ensures ~99.7% of values fall within the range
    num = num / 6.0 + 0.5; 

    // Resample if the value falls outside [0, 1]
    if (num > 1 || num < 0) return randomBellCurveInt(min, max);

    // Scale to range and round
    return Math.round(num * (max - min) + min);
}

// Pick island sizes for one candidate puzzle
function chooseIslandSizes(config) {
    const sizes = [];
    const [minLand, maxLand] = config.landRange;
    const targetLand = randomBellCurveInt(minLand, maxLand);
    let totalLand = 0;

    while (totalLand < targetLand) {
        const remaining = targetLand - totalLand;  // remaining number of land squares to fill on the board
        const maxSize = Math.min(config.maxIslandSize, remaining);  // max size of island is either number listed here or 'remaining', whichever is smaller
        
        let size;
        // Most islands are small/medium, sometimes can be large
        if (Math.random() < 0.75 || maxSize < 6) {
            size = randomBellCurveInt(1, Math.min(5, maxSize));
        } else {
            size = randomBellCurveInt(6, maxSize);
        }

        sizes.push(size);  // add island size to list of island sizes
        totalLand += size;  // add amount of land from new island to total land count
    }

    return sizes;
}

// Return the 4 cell indices of the first 2x2 water block found
function findFirst2x2WaterBlock(config, board) {
    for (let row = 0; row < config.size - 1; row++) {
        for (let col = 0; col < config.size - 1; col++) {
            const cells = [
                index(config, row, col),
                index(config, row, col + 1),
                index(config, row + 1, col),
                index(config, row + 1, col + 1),
            ];

            if (cells.every(cellIndex => board[cellIndex] === "#")) {
                return cells;
            }
        }
    }
    return null;  // no 2x2 water blocks in board
}

// Add size-1 islands until there are no 2x2 water blocks
function repair2x2WaterBlocks(config, board, islands) {
    while (true) {
        const waterBlock = findFirst2x2WaterBlock(config, board);

        // No 2x2 water left --> repair succeeded
        if (waterBlock === null) {
            return true;
        }

        let repaired = false;

        // Try placing a 1-cell island in one of the cells of this 2x2 water block
        for (const cellIndex of shuffle(waterBlock)) {
            if (canPlaceIslandCell(config, board, [], cellIndex)) {
                board[cellIndex] = " ";  // change cell to land
                islands.push([cellIndex]);  // add new land cell as island
                repaired = true;  // this water block is repaired yay
                break;
            }
        }

        // Could not legally break this 2x2 water block --> repair fails
        if (!repaired) {
            return false;
        }
    }
}

function getWaterRegions(config, board) {
    const visited = new Set();
    const regions = [];

    for (let cellIndex = 0; cellIndex < config.size * config.size; cellIndex++) {
        if (board[cellIndex] !== "#") continue;
        if (visited.has(cellIndex)) continue;

        const region = [];
        const stack = [cellIndex];
        visited.add(cellIndex);

        while (stack.length > 0) {
            const current = stack.pop();
            region.push(current);

            for (const neighborIndex of getNeighborCellIndices(config, current)) {
                if (visited.has(neighborIndex)) continue;
                if (board[neighborIndex] !== "#") continue;

                visited.add(neighborIndex);
                stack.push(neighborIndex);
            }
        }

        regions.push(region);
    }

    return regions;
}

function getIslandIndexContainingCell(islands, cellIndex) {
    for (let i = 0; i < islands.length; i++) {
        if (islands[i].includes(cellIndex)) {
            return i;
        }
    }
    return -1;
}

function isConnectedCellGroup(config, cells) {
    if (cells.length <= 1) return true;

    const cellSet = new Set(cells);
    const visited = new Set();
    const stack = [cells[0]];
    visited.add(cells[0]);

    while (stack.length > 0) {
        const current = stack.pop();

        for (const neighborIndex of getNeighborCellIndices(config, current)) {
            if (!cellSet.has(neighborIndex)) continue;
            if (visited.has(neighborIndex)) continue;

            visited.add(neighborIndex);
            stack.push(neighborIndex);
        }
    }

    return visited.size === cells.length;
}

// Check whether land cell can be removed from its island
function canRemoveIslandCell(config, islands, cellIndex) {
    const islandIndex = getIslandIndexContainingCell(islands, cellIndex);
    if (islandIndex === -1) return false;

    const island = islands[islandIndex];

    // Do not delete an island completely
    if (island.length <= 1) return false;

    const remainingCells = island.filter(cell => cell !== cellIndex);

    return isConnectedCellGroup(config, remainingCells);
}

// Actually remove land cell chosen from above function
function removeIslandCell(config, board, islands, cellIndex) {
    const islandIndex = getIslandIndexContainingCell(islands, cellIndex);
    if (islandIndex === -1) return false;
    if (!canRemoveIslandCell(config, islands, cellIndex)) return false;

    islands[islandIndex] = islands[islandIndex].filter(cell => cell !== cellIndex);
    board[cellIndex] = "#";

    return true;
}

function distanceToNearestWater(config, startCellIndex, waterSet) {
    const visited = new Set();
    const queue = [{ cellIndex: startCellIndex, distance: 0 }];
    visited.add(startCellIndex);

    while (queue.length > 0) {
        const { cellIndex, distance } = queue.shift();

        if (waterSet.has(cellIndex)) {
            return distance;
        }

        for (const neighborIndex of getNeighborCellIndices(config, cellIndex)) {
            if (visited.has(neighborIndex)) continue;

            visited.add(neighborIndex);
            queue.push({
                cellIndex: neighborIndex,
                distance: distance + 1,
            });
        }
    }
    return Infinity;
}

function repairDisconnectedWater(config, board, islands, maxCarves = 20) {
    let carves = 0;

    while (!isWaterConnected(config, board)) {
        if (carves >= maxCarves) return false;

        const waterRegions = getWaterRegions(config, board);
        if (waterRegions.length <= 1) return true;

        // Connect smaller regions into the largest one
        waterRegions.sort((a, b) => b.length - a.length);

        const mainRegion = waterRegions[0];
        const mainWater = new Set(mainRegion);

        let bestCellToCarve = null;
        let bestDistance = Infinity;

        // Look at land cells next to smaller water regions.
        // Prefer one that is close to the main water region.
        for (let regionIndex = 1; regionIndex < waterRegions.length; regionIndex++) {
            for (const waterCell of waterRegions[regionIndex]) {
                for (const neighborIndex of getNeighborCellIndices(config, waterCell)) {
                    if (board[neighborIndex] === "#") continue;
                    if (!canRemoveIslandCell(config, islands, neighborIndex)) continue;

                    const distance = distanceToNearestWater(config, neighborIndex, mainWater);

                    if (distance < bestDistance) {
                        bestDistance = distance;
                        bestCellToCarve = neighborIndex;
                    }
                }
            }
        }

        if (bestCellToCarve === null) {
            return false;
        }

        removeIslandCell(config, board, islands, bestCellToCarve);
        carves++;
    }
    return true;
}

// Try to build one complete solved board candidate
function buildCandidateSolution(config) {
    const board = makeEmptyBoard(config);
    const islandSizes = orderIslandSizesForPlacement(chooseIslandSizes(config));
    const islands = [];

    // Loop through all islands by their size clue number
    for (const size of islandSizes) {
        // Choose random water tile to start building from
        const possibleStarts = shuffle(getAllWaterCellIndices(config, board));
        let placedIsland = null;

        // Try different starting cells until this island successfully grows
        for (const startCellIndex of possibleStarts) {
            // Try to grow island of desired size from starting water cell
            const island = growIslandWithRetries(config, board, startCellIndex, size, getGrowAttemptsForSize(size));
            // If island couldn't grow from water cell, try another starting water cell
            if (island !== null) {
                placedIsland = island;
                break;
            }
        }

        // If this island could not be placed from any water tile, abandon this whole candidate
        if (placedIsland === null) {
            return null;
        }

        // Add successfully placed island into island list
        islands.push(placedIsland);
    }

    // Actively fix 2x2 water instead of hoping validation passes for less attempts hopefully
    if (!repair2x2WaterBlocks(config, board, islands)) {
        return null;
    }

    if (!repairDisconnectedWater(config, board, islands)) {
        return null;
    }

    return { board, islands };
}

function getClues(board) {
    const clues = [];

    for (let i = 0; i < board.length; i++) {
        const value = clueToNumber(board[i]);
        if (value !== null) {
            clues.push({
                index: i,
                value,
                cell: board[i],
            });
        }
    }

    return clues;
}

function cellTouchesOtherClue(config, board, cellIndex, ownClueIndex) {
    for (const neighborIndex of getNeighborCellIndices(config, cellIndex)) {
        if (neighborIndex === ownClueIndex) continue;
        if (isClue(board[neighborIndex])) return true;
    }

    return false;
}

function generateIslandShapesForClue(config, board, clueIndex, targetSize, maxResults = Infinity) {
    const results = [];
    const seen = new Set();

    function signature(cells) {
        return [...cells].sort((a, b) => a - b).join(",");
    }

    function search(cells) {
        if (results.length >= maxResults) return;

        const sig = signature(cells);
        if (seen.has(sig)) return;
        seen.add(sig);

        if (cells.size === targetSize) {
            results.push([...cells]);
            return;
        }

        const candidates = new Set();

        for (const cellIndex of cells) {
            for (const neighborIndex of getNeighborCellIndices(config, cellIndex)) {
                if (cells.has(neighborIndex)) continue;

                const cell = board[neighborIndex];

                if (isClue(cell) && neighborIndex !== clueIndex) continue;
                if (cellTouchesOtherClue(config, board, neighborIndex, clueIndex)) continue;

                candidates.add(neighborIndex);
            }
        }

        for (const candidate of candidates) {
            if (results.length >= maxResults) return;

            const nextCells = new Set(cells);
            nextCells.add(candidate);
            search(nextCells);
        }
    }

    search(new Set([clueIndex]));

    return results;
}

function shapeToMask(shape) {
    let mask = 0n;

    for (const cellIndex of shape) {
        mask |= 1n << BigInt(cellIndex);
    }

    return mask;
}

function shapeTouchMask(config, shape) {
    let mask = 0n;

    for (const cellIndex of shape) {
        mask |= 1n << BigInt(cellIndex);

        for (const neighborIndex of getNeighborCellIndices(config, cellIndex)) {
            mask |= 1n << BigInt(neighborIndex);
        }
    }

    return mask;
}

function get2x2Masks(config) {
    const masks = [];
    for (let row = 0; row < config.size - 1; row++) {
        for (let col = 0; col < config.size - 1; col++) {
            let mask = 0n;

            mask |= 1n << BigInt(index(config, row, col));
            mask |= 1n << BigInt(index(config, row, col + 1));
            mask |= 1n << BigInt(index(config, row + 1, col));
            mask |= 1n << BigInt(index(config, row + 1, col + 1));

            masks.push(mask);
        }
    }
    return masks;
}

function hasForced2x2Water(config, landMask, possibleFutureLandMask) {
    const maybeLandMask = landMask | possibleFutureLandMask;
    for (const blockMask of config.water2x2Masks) {
        if ((maybeLandMask & blockMask) === 0n) return true;
    }
    return false;
}

function bitFor(index) {
    return 1n << BigInt(index);
}

function countBits(mask) {
    let count = 0;

    while (mask !== 0n) {
        mask &= mask - 1n;
        count++;
    }

    return count;
}

function getIndicesFromMask(mask) {
    const indices = [];
    let index = 0;

    while (mask !== 0n) {
        if ((mask & 1n) !== 0n) {
            indices.push(index);
        }

        mask >>= 1n;
        index++;
    }

    return indices;
}

function areShapeObjectsCompatible(shapeA, shapeB) {
    return (shapeA.blockedMask & shapeB.landMask) === 0n;
}

function buildClueOptions(config, startingPuzzle, maxPerClue = Infinity, maxTotal = Infinity) {
    const board = typeof startingPuzzle === "string"
        ? startingPuzzle.split("")
        : [...startingPuzzle];

    const clues = getClues(board);
    const clueOptions = [];

    let totalShapes = 0;
    let maxShapes = 0;
    let tooExpensive = false;

    for (const clue of clues) {
        const rawShapes = generateIslandShapesForClue(
            config, 
            board,
            clue.index,
            clue.value,
            maxPerClue
        );

        const shapes = rawShapes.map(shape => ({
            cells: shape,
            landMask: shapeToMask(shape),
            blockedMask: shapeTouchMask(config, shape),
        }));

        totalShapes += shapes.length;
        maxShapes = Math.max(maxShapes, shapes.length);

        clueOptions.push({
            clue,
            shapes,
            allShapeMask: (1n << BigInt(shapes.length)) - 1n,
        });

        if (shapes.length >= maxPerClue || totalShapes >= maxTotal) {
            tooExpensive = true;
            break;
        }
    }

    return {
        board,
        clueOptions,
        stats: {
            total: totalShapes,
            max: maxShapes,
            tooExpensive,
        },
    };
}

function countSolutionsFromClueOptions(config, clueOptions, maxSolutions = 2, maxNodes = 50000) {
    const compatibleShapeMasks = clueOptions.map((optionA, optionAIndex) => {
        return optionA.shapes.map(shapeA => {
            return clueOptions.map((optionB, optionBIndex) => {
                if (optionAIndex === optionBIndex) return 0n;

                let mask = 0n;

                for (let shapeBIndex = 0; shapeBIndex < optionB.shapes.length; shapeBIndex++) {
                    const shapeB = optionB.shapes[shapeBIndex];

                    if (areShapeObjectsCompatible(shapeA, shapeB)) {
                        mask |= bitFor(shapeBIndex);
                    }
                }

                return mask;
            });
        });
    });

    let solutions = 0;
    let nodes = 0;
    const chosen = [];
    let hitNodeLimit = false;

    function getPossibleFutureLandMask(possibleMasks, usedOptions) {
        let mask = 0n;

        for (let optionIndex = 0; optionIndex < clueOptions.length; optionIndex++) {
            if (usedOptions.has(optionIndex)) continue;

            for (const shapeIndex of getIndicesFromMask(possibleMasks[optionIndex])) {
                mask |= clueOptions[optionIndex].shapes[shapeIndex].landMask;
            }
        }

        return mask;
    }

    function chooseNextOption(possibleMasks, usedOptions) {
        let bestOptionIndex = -1;
        let bestCount = Infinity;

        for (let optionIndex = 0; optionIndex < clueOptions.length; optionIndex++) {
            if (usedOptions.has(optionIndex)) continue;

            const count = countBits(possibleMasks[optionIndex]);

            if (count === 0) return optionIndex;

            if (count < bestCount) {
                bestCount = count;
                bestOptionIndex = optionIndex;
            }
        }

        return bestOptionIndex;
    }

    function search(landMask, possibleMasks, usedOptions) {
        nodes++;
        if (nodes > maxNodes) {
            hitNodeLimit = true;
            return;
        }
        if (solutions >= maxSolutions) return;

        const possibleFutureLandMask = getPossibleFutureLandMask(possibleMasks, usedOptions);
        if (hasForced2x2Water(config, landMask, possibleFutureLandMask)) return;

        if (usedOptions.size === clueOptions.length) {
            const finished = Array(config.size * config.size).fill("#");

            for (const { optionIndex, shapeIndex } of chosen) {
                const clue = clueOptions[optionIndex].clue;
                const shape = clueOptions[optionIndex].shapes[shapeIndex];

                for (const cellIndex of shape.cells) {
                    finished[cellIndex] = " ";
                }

                finished[clue.index] = clue.cell;
            }

            if (isValidFinishedBoard(config, finished)) {
                solutions++;
            }

            return;
        }

        const optionIndex = chooseNextOption(possibleMasks, usedOptions);
        const shapeMask = possibleMasks[optionIndex];

        if (shapeMask === 0n) return;

        usedOptions.add(optionIndex);

        for (const shapeIndex of getIndicesFromMask(shapeMask)) {
            const shape = clueOptions[optionIndex].shapes[shapeIndex];
            const nextPossibleMasks = [...possibleMasks];

            let deadBranch = false;

            for (let otherOptionIndex = 0; otherOptionIndex < clueOptions.length; otherOptionIndex++) {
                if (usedOptions.has(otherOptionIndex)) continue;

                nextPossibleMasks[otherOptionIndex] &=
                    compatibleShapeMasks[optionIndex][shapeIndex][otherOptionIndex];

                if (nextPossibleMasks[otherOptionIndex] === 0n) {
                    deadBranch = true;
                    break;
                }
            }

            if (!deadBranch) {
                chosen.push({ optionIndex, shapeIndex });

                search(
                    landMask | shape.landMask,
                    nextPossibleMasks,
                    usedOptions
                );

                chosen.pop();
            }

            if (solutions >= maxSolutions) break;
        }

        usedOptions.delete(optionIndex);
    }

    const initialPossibleMasks = clueOptions.map(option => option.allShapeMask);
    search(0n, initialPossibleMasks, new Set());

    return {
        solutions,
        complete: !hitNodeLimit,
        nodes,
    };
}

function countSolutionsByIslands(config, startingPuzzle, maxSolutions = 2, maxNodes = 50000) {
    const { clueOptions } = buildClueOptions(config, startingPuzzle);
    return countSolutionsFromClueOptions(config, clueOptions, maxSolutions, maxNodes);
}

function printShapeCounts(config, puzzle) {
    const board = puzzle.split("");
    const clues = getClues(board);

    const counts = clues.map(clue => ({
        clue: clue.cell,
        index: clue.index,
        shapes: generateIslandShapesForClue(config, board, clue.index, clue.value).length,
    }));

    counts.sort((a, b) => b.shapes - a.shapes);
    console.log(counts);
}

function generateSolvedPuzzle(size = 9, maxAttempts = 10000) {
    const config = makeConfig(size);

    // Add fail counters for testing purposes
    const failReasons = {
        nullBoard: 0,
        twoByTwoWater: 0,
        disconnectedWater: 0,
        invalidFinished: 0,
        tooManyOnes: 0,
        tooExpensive: 0,
        tooHardToCount: 0,
        notUnique: 0,
    };
    let puzzNum = 1;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const candidate = buildCandidateSolution(config);
        if (attempt % 10000 === 0) console.log(`Attempt: ${attempt}`);

        if (candidate === null) {
            failReasons.nullBoard++;
            continue;
        }

        if (has2x2Water(config, candidate.board)) {
            failReasons.twoByTwoWater++;
            continue;
        }

        if (!isWaterConnected(config, candidate.board)) {
            failReasons.disconnectedWater++;
            continue;
        }

        const board = [...candidate.board];
        const cluePositions = chooseBestCluePositions(config, candidate.islands);

        for (let i = 0; i < candidate.islands.length; i++) {
            placeIslandWithClue(board, candidate.islands[i], cluePositions[i], candidate.islands[i].length);
        }

        if (!isValidFinishedBoard(config, board)) {
            failReasons.invalidFinished++;
            continue;
        }

        // Limit how many size-1 islands appear as clues
        if (board.filter(char => char === "1").length > config.maxOneClues) {
            failReasons.tooManyOnes++;
            continue;
        }

        const solutionString = toString(board);
        const startingPuzzle = solutionToStarting(solutionString);
        console.log(`Analyzing solution uniqueness for valid puzzle #${puzzNum++}...`);
        //printShapeCounts(startingPuzzle);

        const clueData = buildClueOptions(config, startingPuzzle, 1501, 6001);

        if (clueData.stats.tooExpensive) {
            failReasons.tooExpensive++;
            continue;
        }

        const solutionResult = countSolutionsFromClueOptions(config, clueData.clueOptions, 2, 50000);

        if (!solutionResult.complete) {
            failReasons.tooHardToCount++;
            continue;
        }

        if (solutionResult.solutions !== 1) {
            failReasons.notUnique++;
            continue;
        }

        console.log(failReasons);
        return solutionString;
    }

    console.log(failReasons);
    return null;
}

//-------------------------------------------------------------------------------------------------------------

// solpuz = generateSolvedPuzzle(7, 10000000);
// puzzle = solutionToStarting(solpuz);
// console.log(puzzle);
// console.log(solpuz);

// solpuz = generateSolvedPuzzle(9, 10000000);
// puzzle = solutionToStarting(solpuz);
// console.log(puzzle);
// console.log(solpuz);

// solpuz = generateSolvedPuzzle(11, 10000000);
// puzzle = solutionToStarting(solpuz);
// console.log(puzzle);
// console.log(solpuz);

//-------------------------------------------------------------------------------------------------------------

// solpuz = generateSolvedPuzzle(9, 10000000);
// puzzle = solutionToStarting(solpuz);
// console.log(puzzle);
// console.log(solpuz);

//-------------------------------------------------------------------------------------------------------------

// const startTime = new Date().getTime();
// for (let i = 0; i < 100; i++) {
//     solpuz = generateSolvedPuzzle(9, 10000000);
// }
// const endTime = new Date().getTime();
// const avgTimeTaken = (endTime - startTime) / 100;
// console.log("Generation takes " + avgTimeTaken + " milliseconds on average");
// puzzle = solutionToStarting(solpuz);
// console.log(puzzle);
// console.log(solpuz);

//printShapeCounts(puzzle);