// Tiny javascript functionality for the puzzle select screen, mostly to set up music
let backgroundMusic;

function preload() {
  backgroundMusic = loadSound('./music/HomeIslandVibe.wav');
}

function setup() {
  noCanvas();

  setupMusicControls(() => backgroundMusic);

  userStartAudio();
  applyMusicSettings(backgroundMusic);
  backgroundMusic.play();
  backgroundMusic.loop();
}