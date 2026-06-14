let square_states = 2; //number of color states each square can have
let puzzles = []; //will store the puzzle starting states and solution states
let cantClick = new Map();
let solution_colors = [];
let rulesPopup, loadingPopup, loadingText, worker;
let currentAttempt = 0;
let candidateCount = 0;
let isGenerating = false;
let done, winnerPopup = false;
let hintSquares = []; let cantBeHint = [];
let controlsDisabled = false;

const urlParams = new URLSearchParams(window.location.search);
const requestedSize = Number(urlParams.get("size"));
const puzzleSize = [7, 9, 11].includes(requestedSize) ? requestedSize : 9;

let rows = puzzleSize;
let cols = puzzleSize;
let square_size = getSquareSize(puzzleSize);

// Changes square size based on the size of the puzzle
function getSquareSize(size) {
  if (size === 7) return 60;
  if (size === 11) return 42;
  return 50;
}

//==================================================================================================================
// Nurikabe rules:
// -"Islands" are made up of white squares, the blue squares are water
// -Each starting square is part of an island, the amount of white squares this island has is listed on the square
// -Each island has only one numbered square
// -Islands cannot touch horizontally or vertically (diagonally is ok)
// -There cannot be 2x2 squares of water
// -All water blocks must be connected
// (Sounds like a lot but it's really not too bad I swear)
//==================================================================================================================

function preload() {
  backgroundMusic = loadSound('../music/PuzzleBop.wav');
}

function setup() {
  // Create a canvas in the center of the screen
  canvas = createCanvas(cols * square_size, rows * square_size);
  var center_x = (windowWidth - width) / 2;
  var center_y = (windowHeight - height) / 2;
  canvas.position(center_x, center_y);

  xpos = []; ypos = [];
  colorState = [];
  sideLength = square_size;
  for (i = 0; i < rows; ++i) {
    for (j = 0; j < cols; ++j) {
      //calculate the index where info will be stored
      var index = (i * cols) + j;

      //calculate and store all the x-coordinates of square centers
      xpos[index] = (j * sideLength) + (sideLength / 2);

      //calculate and store all the y-coordinates of square centers
      ypos[index] = (i * sideLength) + (sideLength / 2);

      colorState[index] = 0; //set all color states to 0 as default
    }
  }

  //set coordinates used to create square to be the center 
  //of the square instead of the top-left corner
  rectMode(CENTER);

  background(220); //gray background

  // Create the pop-up text box using createDiv with the Nurikabe rules
  rulesPopup = createDiv(`
      <h2>Nurikabe rules:</h2>
      <ul>
          <li>"Islands" are made up of white squares, the blue squares are water</li>
          <li>Each numbered square is part of an island, with the number being the amount of white squares this island has</li>
          <li>Each island has only one numbered square</li>
          <li>Islands cannot touch horizontally or vertically (diagonally is ok)</li>
          <li>There cannot be 2x2 squares of water</li>
          <li>All water blocks must be connected</li>
      </ul>
  `).id('rulesPopup');
  rulesPopup.style('font-size', '16px');
  rulesPopup.style('padding', '10px');
  rulesPopup.style('background-color', '#fff');
  rulesPopup.style('border', '1px solid #000');
  rulesPopup.style('position', 'absolute');
  rulesPopup.style('left', '77%'); //put rules popup to the right of the puzzle
  rulesPopup.style('top', '50%');
  rulesPopup.style('transform', 'translate(-50%, -50%)');
  rulesPopup.style('display', 'none'); // Hide the pop-up initially

  // Create a button to show rules pop-up
  let rulesButton = createButton('Rules').id('rulesButton');
  rulesButton.position(10, 60);
  rulesButton.mousePressed(showPopup);

  // Create a button inside rules pop-up to close it
  let closeRules = createButton('Close').id('closePopup');
  closeRules.mousePressed(hidePopup);
  closeRules.parent(rulesPopup); // Attach the button to the pop-up
  closeRules.style('position', 'absolute');
  closeRules.style('top', '10px');
  closeRules.style('right', '10px');

  // Create a button to restart the puzzle
  let restartButton = createButton('Restart');
  restartButton.position(10, 110);
  restartButton.mousePressed(restart);

  // Create a button to solve the puzzle for testing
  // let solveButton = createButton('Solve');
  // solveButton.position(10, 310);
  // solveButton.mousePressed(solve);

  let hintButton = createButton('Hint');
  hintButton.position(10, 160);
  hintButton.mousePressed(hint);

  // Initialize music controls
  setupMusicControls(() => backgroundMusic);

  // Generate nurikabe puzzle with on-screen loading message
  startGeneration();

  // Here is how the puzzle start and puzzle solution state is stored after generateStartingColors and generateSolutionColors:
  //   cantClick: new Map([
  //     [36, 2], [63, 3], [19, 3], [29, 1], [66, 3], [14, 4], [51, 3], [61, 4], [17, 2], [44, 4]
  //   ]);
  //   //0 = water, 1 = island (laid out to look just like the puzzle)
  //   solution_colors: [0, 0, 0, 0, 0, 0, 0, 0, 0, 
  //                     0, 1, 1, 0, 1, 1, 0, 1, 1, 
  //                     0, 1, 0, 0, 1, 0, 0, 0, 0, 
  //                     0, 0, 1, 0, 1, 0, 1, 1, 1,
  //                     1, 1, 0, 0, 0, 1, 0, 0, 1,
  //                     0, 0, 0, 1, 0, 1, 1, 0, 0,
  //                     0, 1, 0, 1, 0, 0, 0, 1, 0,
  //                     1, 1, 0, 1, 0, 1, 1, 1, 0,
  //                     0, 0, 0, 0, 0, 0, 0, 0, 0];
}

function loadMusic() {
	userStartAudio(); //music starts playing when user interacts with browser
  applyMusicSettings(backgroundMusic);
	backgroundMusic.play();
  backgroundMusic.loop();
}

function startGeneration() {
    isGenerating = true;
    showLoading();

    worker = new Worker("puzzleWorker.js");
    worker.onmessage = function(e) {
        if (e.data.type === "progress") {
            currentAttempt = e.data.attempt;
            loadingText.html(
                `<h2>Generating Puzzle...</h2>
                Attempt: ${currentAttempt}<br>
                Candidates Checked: ${candidateCount}`
            );
            return;
        }
        if (e.data.type === "candidateCount") {
            candidateCount = e.data.puzzNum;
            loadingText.html(
                `<h2>Generating Puzzle...</h2>
                Attempt: ${currentAttempt}<br>
                Candidates Checked: ${candidateCount}`
            );
            return;
        }
        const solpuz = e.data;

        cantClick = generateStartingColors(solutionToStarting(solpuz));
        solution_colors = generateSolutionColors(solpuz);

        isGenerating = false;

        hideLoading();

        loadMusic();

        worker.terminate();
    };

    worker.postMessage({
        size: puzzleSize
    });
}

function showLoading() {
  loadingPopup = createDiv();

  loadingPopup.html(`
    <div class="spinner"></div>
  `);

  loadingText = createDiv("Generating Puzzle...");
  loadingText.parent(loadingPopup);

  loadingPopup.style('position', 'absolute');
  loadingPopup.style('left', '50%');
  loadingPopup.style('top', '50%');
  loadingPopup.style('transform', 'translate(-50%, -50%)');

  loadingPopup.style('padding', '20px');
  loadingPopup.style('background-color', 'white');
  loadingPopup.style('border', '2px solid black');
  loadingPopup.style('border-radius', '10px');

  loadingPopup.style('z-index', '1000');
}

function hideLoading() {
  if (loadingPopup) {
    loadingPopup.remove();
  }
}

function draw() {
  if (!cantClick || !solution_colors) {
    return;
  }

  var isSolved = true;
  // Variable that will track which square is hovered
  let hoverSquare = -1;
  
  // Loop through all square position coordinates and color states
  for (i = 0; i < rows * cols; ++i) {
    if (!done) {
      //get index of square currently hovered over
      if (dist(mouseX, 0, xpos[i], 0) < sideLength / 2 && dist(0, mouseY, 0, ypos[i]) < sideLength / 2) {
        hoverSquare = i;
      }

      // Draw the background for the current square based on its state
      if (cantClick.has(i)) {
        fill('white');
      } 
      else {
        if (colorState[i] == 0) fill(0, 0, 200); // 0 = blue (water)
        if (colorState[i] == 1) fill('white');   // 1 = white (land)
        if (colorState[i] != solution_colors[i]) isSolved = false;
      }
      //apply hover effect for squares that aren't numbered squares or hint squares
      if (!hintSquares.includes(i) && !cantClick.has(i)) {
        if (i === hoverSquare) {
          if (colorState[i] == 0) {
            fill(0, 0, 175); //slightly darker blue
          }
          else fill(230, 230, 230); //light grey
        }
      }

      rect(xpos[i], ypos[i], sideLength, sideLength); // Create square
    }
    else {
      //make water squares green when puzzle completes
      if (solution_colors[i] == 0) fill('green');
      else fill('white');
      rect(xpos[i], ypos[i], sideLength, sideLength);
    }

    //Draw number on starting squares
    strokeWeight(0); // Set no stroke weight so text doesn't get borders
      // Draw numbers on starting squares
      if (cantClick.has(i)) {
        fill('black');
        textSize(square_size * 0.6);
        textAlign(CENTER, CENTER);
        text(cantClick.get(i), xpos[i], ypos[i]); // Draw number
      }
    strokeWeight(1); // Reset stroke weight for next iteration
  }

  if (!done) {
    //Draw green outline for hint squares last so they appear on top
    hintSquares.forEach((index) => {
      noFill();                // No fill for outline
      stroke('green');         // Green border for hint squares
      strokeWeight(3);         // Thicker stroke for visibility
      rect(xpos[index], ypos[index], sideLength, sideLength); // Draw the green outline
    });

    // Reset stroke settings after drawing outlines
    strokeWeight(1);
    stroke('black');
  }
  
  if (isSolved && !done && !winnerPopup) {
    winnerPopup = true;
    setGameControlsDisabled(true);  // Disable all the buttons from being pressed when winner pop-up is on-screen
    winnerText();
    done = true;
  }
}


function mouseClicked() {
  if (isGenerating) return;
  // When the mouse is clicked, change the color state by negating the value
  for (i = 0; i < rows * cols; ++i) {
    if (!hintSquares.includes(i)) {
      //check if mouse position is within the current square
      if (dist(mouseX, 0, xpos[i], 0) < sideLength / 2 && dist(0, mouseY, 0, ypos[i]) < sideLength / 2) {
        ++colorState[i];
        colorState[i] = colorState[i] % square_states;
        return;
      }
    }
  }
}

function generateStartingColors(puzzle) {
  cantClickMap = new Map();
  for (let i = 0; i < puzzle.length; ++i) {
    const char = puzzle[i];
    if (char !== '.' && char !== ' ') { // Only process numbers
      const key = parseInt(char, 16); // Convert character to integer using base 16
      if (!isNaN(key)) { // Ensure char was a valid hex digit
        cantClickMap.set(i, key);
      }
    }
  }
  return cantClickMap;
}

function generateSolutionColors(solpuz) {
  var solution_colors = [];
  for (var i = 0; i < solpuz.length; i++) {
    solution_colors.push(solpuz[i] !== '#' ? 1 : 0);
  }
  return solution_colors;
}

function showPopup() {
  rulesPopup.style('display', 'block'); // Show the pop-up
}

function hidePopup() {
  rulesPopup.style('display', 'none'); // Hide the pop-up
}

// Disable all the buttons after puzzle completion
function setGameControlsDisabled(disabled) {
  controlsDisabled = disabled;
  if (rulesPopup) {
    rulesPopup.style('display', 'none');
  }
  document.querySelectorAll('button').forEach((button) => {
    button.disabled = disabled;
  });
}

//Reset all the colors when "Restart" button is pressed
function restart() {
  if (controlsDisabled || isGenerating) return;

  for (let i = 0; i < colorState.length; ++i) {
    if (!hintSquares.includes(i)) colorState[i] = 0; //only reset squares not part of hints
  }
}

//Set current color state to the solution colors to solve the puzzle
function solve() {
  colorState = solution_colors;
  //freeze canvas after one more loop of draw()
  redraw();
  noLoop();
}

//gives the player a hint
async function hint() {
  if (controlsDisabled || isGenerating) return;  // So hint cannot be pressed after puzzle completion

  // Check if the no more hints popup already exists
  if (document.getElementById("noHint")) {
    return; // Exit the function if the popup is already displayed
  }

  // Retrieve the number of hints from localStorage
  let hints = parseInt(localStorage.getItem('hints')) || 0;

  //Checks if the user has hints to use 
  if (hints > 0) {
    console.log(`User has ${hints} hint(s) remaining.`);
    --hints; //decrease the number of hints by 1
      // Save the updated hint value back to localStorage
      localStorage.setItem('hints', hints);
      // Update displayed hint count
      const hintCountDisplay = document.getElementById('hintCount');
      if (hintCountDisplay) {
          hintCountDisplay.textContent = hints;
      }
  }
  else {
    console.log("User has no hints!");
      alert('You have no hints to use!');
      return;
  }

  let availableHintIndices = [];
  for (let i = 0; i < rows * cols - rows; ++i) {
    if (i % rows !== rows - 1) availableHintIndices.push(i);
  }
  let topLeft; // Declare topLeft
  do {
    topLeft = Math.floor(Math.random() * (rows * cols - rows)); // Generate a random index between 0 and 71 (all rows but the bottom one)
    
    // Filter out any positions that are in cantBeHint
    availableHintIndices = availableHintIndices.filter(pos => !cantBeHint.includes(pos));

    //if there are no more available locations for hint
    if (availableHintIndices.length === 0) {
      console.log("No more available places for a hint.");
      let noMoreHint = createDiv(`<h2>No more available places for a hint.</h2>`).id(`noHint`);
      noMoreHint.style('font-size', '16px');
      noMoreHint.style('padding', '10px');
      noMoreHint.style('background-color', '#fff');
      noMoreHint.style('border', '1px solid #000');
      noMoreHint.style('position', 'absolute');
      noMoreHint.style('left', '50%');
      noMoreHint.style('top', '50%');
      noMoreHint.style('transform', 'translate(-50%, -50%)');
      noMoreHint.style('z-index', '1000');
      noMoreHint.style('opacity', '1');

      await new Promise(r => setTimeout(r, 700)); //wait a lil
      // Gradually decrease opacity
      let opacity = 100;
      let fadeInterval = setInterval(() => {
        opacity -= 5; // Decrease opacity value, adjust as needed for speed
        noMoreHint.style('opacity', opacity / 100);

        // Stop the interval once fully invisible
        if (opacity <= 0) {
          clearInterval(fadeInterval);
          noMoreHint.remove(); // Remove the popup from the DOM, so it can appear again if the hint button is clicked again
        }
      }, 50); // Adjust the interval time to control the speed of the fade-out

      return; // Terminate the function if there are no available positions left
    }
  } while (topLeft % rows === rows - 1 || cantBeHint.includes(topLeft)); // Keep generating until it's not in the right column and not in a place that would overlap another hint

  hintSquares.push(topLeft, topLeft + 1, topLeft + rows, topLeft + rows + 1); //generate the three other squares of the 2x2 hint square
  cantBeHint.push(topLeft, topLeft + 1, topLeft + rows, topLeft + rows + 1, topLeft - rows + 1, topLeft - rows, topLeft - rows - 1, topLeft - 1, topLeft + rows - 1); //any topLeft whose hint square would intersect with another hintSquares cannot be hint

  // For each square in hintSquares, set the colorState to the correct solution and make it unclickable
  hintSquares.forEach((index) => {
    colorState[index] = solution_colors[index]; // Set the correct color from the solution
  });

  // console.log(topLeft);
  // console.log(hintSquares); // Log the value for debugging
  // console.log(cantBeHint);
}

async function winnerText() {
  await new Promise(r => setTimeout(r, 2000)); //wait a sec

  var coins_earned = 0;
  if (puzzleSize == 7) { coins_earned = randomBellCurveInt(25, 75); }
  if (puzzleSize == 9) { coins_earned = randomBellCurveInt(75, 125); }
  if (puzzleSize == 11) { coins_earned = randomBellCurveInt(125, 175); }

  winner = createDiv(`
    <h2>Congrats!</h2>
    <p>You have solved the puzzle.</p>
    <p>${coins_earned} coins earned.</p>
  `).id(`completionText`);
  // After creating the element, add an id to it
  winner.style('font-size', '16px');
  winner.style('padding', '10px');
  winner.style('background-color', '#fff');
  winner.style('border', '1px solid #000');
  winner.style('position', 'absolute');
  winner.style('left', '50%');
  winner.style('top', '50%');
  winner.style('transform', 'translate(-50%, -50%)');
  winner.style('z-index', '1000');
  winner.style('opacity', '0'); // Start with 0 opacity

  winnerPopup = true;

  // Gradually increase opacity
  let opacity = 0;
  let fadeInterval = setInterval(() => {
    opacity += 5; // Increase opacity value, adjust as needed for speed
    winner.style('opacity', opacity / 100);

    // Stop the interval once fully visible
    if (opacity >= 100) {
      clearInterval(fadeInterval);
    }
  }, 50); // Adjust the interval time to control the speed of the fade-in

  await new Promise(r => setTimeout(r, 5000)); //wait a sec or two

  addCurrency(coins_earned);

  window.location.href = "../puzzleSelect.html"; //send user back to puzzle select
}

//to fade out element
function fadeOut(element, duration) {
  let opacity = 1;
  const interval = 10; // Adjust as needed for smoothness

  const timer = setInterval(() => {
    if (opacity <= 0) {
      clearInterval(timer);
      element.style.display = "none";
    } else {
      opacity -= interval / duration;
      element.style.opacity = opacity;
    }
  }, interval);
}
