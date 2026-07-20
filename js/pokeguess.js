const attemptsValue = document.getElementById("attemptsValue");
const clueLetters = document.getElementById("clueLetters");
const clueType = document.getElementById("clueType");
const clueAbility = document.getElementById("clueAbility");
const clueGeneration = document.getElementById("clueGeneration");
const clueColor = document.getElementById("clueColor");
const clueHabitat = document.getElementById("clueHabitat");
const clueEggGroups = document.getElementById("clueEggGroups");
const clueLegendary = document.getElementById("clueLegendary");
const clueMythical = document.getElementById("clueMythical");
const clueEvolution = document.getElementById("clueEvolution");
const guessInput = document.getElementById("guessInput");
const guessButton = document.getElementById("guessButton");
const restartButton = document.getElementById("restartButton");
const gameFeedback = document.getElementById("gameFeedback");
const historyList = document.getElementById("historyList");
const pokemonSprite = document.getElementById("pokemonSprite");
const pokemonResult = document.getElementById("pokemonResult");
const inputAnimationTime = 700;

const maxAttempts = 10;
const nextRoundDelay = 15000;
const apiBaseUrl = "https://pokeapi.co/api/v2";
const MAX_SPECIES = 1025;
const maxClues = 11;
let attempts = 0;
let currentPokemon = null;
let roundLocked = false;
let revealedClues = 1;
let currentLetters = "";
let revealedLetterIndexes = new Set();
let nextRoundTimeout = null;
let countdownInterval = null;
let isLoading = false;

const generationLabels = {
  "generation-i": "I",
  "generation-ii": "II",
  "generation-iii": "III",
  "generation-iv": "IV",
  "generation-v": "V",
  "generation-vi": "VI",
  "generation-vii": "VII",
  "generation-viii": "VIII",
  "generation-ix": "IX",
};

const colorLabels = {
  black: "Preto",
  blue: "Azul",
  brown: "Marrom",
  gray: "Cinza",
  green: "Verde",
  pink: "Rosa",
  purple: "Roxo",
  red: "Vermelho",
  white: "Branco",
  yellow: "Amarelo",
  gold: "Dourado",
  orange: "Laranja",
  beige: "Bege",
  grayish: "Cinza",
  "light-blue": "Azul-claro",
};

const habitatLabels = {
  cave: "Caverna",
  forest: "Floresta",
  grassland: "Pradaria",
  mountain: "Montanha",
  rare: "Raro",
  "rough-terrain": "Terreno acidentado",
  sea: "Mar",
  urban: "Urbano",
  "waters-edge": "Beira d'água",
};
// Funções de Formatação
function capitalizeWords(text) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatType(typeName) {
  return capitalizeWords(typeName.replace(/-/g, " "));
}

function formatAbilityList(abilities) {
  return abilities.filter(Boolean).join(", ");
}

function toDisplayName(name) {
  return capitalizeWords(name.replace(/-/g, " "));
}

function normalize(text) {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getComparableChar(char) {
  return normalize(char).replace(/[^a-z]/g, "");
}
//Funções do nome
function getRandomLetterIndexPool(name) {
  return Array.from(name)
    .map((char, index) => ({ char: normalize(char), index }))
    .filter(({ char }) => /[a-z]/.test(char))
    .map(({ index }) => index);
}

function getInitialRevealIndexes(name, revealCount = 2) {
  const letterIndexes = getRandomLetterIndexPool(name);

  if (!letterIndexes.length) {
    return new Set();
  }

  const revealedIndexes = new Set();

  while (revealedIndexes.size < Math.min(revealCount, letterIndexes.length)) {
    const randomIndex =
      letterIndexes[Math.floor(Math.random() * letterIndexes.length)];
    revealedIndexes.add(randomIndex);
  }

  return revealedIndexes;
}

function buildHangmanMask(name, revealedIndexes) {
  const chars = Array.from(name);

  return chars
    .map((char, index) => {
      if (!/[a-záàâãéèêíïóôõúç]/i.test(char)) {
        return char;
      }

      return revealedIndexes.has(index) ? char.toUpperCase() : "_";
    })
    .join(" ");
}
//API
async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Falha ao buscar ${url}`);
  }

  return response.json();
}

function findEvolutionNode(chain, targetName) {
  if (!chain) {
    return null;
  }

  if (chain.species?.name === targetName) {
    return chain;
  }

  for (const evolution of chain.evolves_to || []) {
    const found = findEvolutionNode(evolution, targetName);

    if (found) {
      return found;
    }
  }

  return null;
}

function getEvolutionStage(speciesName, evolutionData) {
  const chain = evolutionData?.chain;

  if (!chain) {
    return "Desconhecida";
  }

  const node = findEvolutionNode(chain, speciesName);

  if (!node) {
    return "Desconhecida";
  }

  const hasPreEvolution = chain.species?.name !== speciesName && !!node;
  const hasNextEvolution = (node.evolves_to || []).length > 0;

  if (!hasPreEvolution && hasNextEvolution) {
    return "Primeira evolução";
  }

  if (hasPreEvolution && hasNextEvolution) {
    return "Evolução intermediária";
  }

  if (hasPreEvolution && !hasNextEvolution) {
    return "Última evolução";
  }

  return "Forma única";
}

async function fetchRandomPokemon() {
  const randomId = Math.floor(Math.random() * MAX_SPECIES) + 1;

  const pokemonData = await fetchJson(`${apiBaseUrl}/pokemon/${randomId}`);
  const speciesData = await fetchJson(pokemonData.species.url);
  const evolutionData = speciesData.evolution_chain?.url
    ? await fetchJson(speciesData.evolution_chain.url)
    : null;

  const typeList = pokemonData.types
    .slice()
    .sort((left, right) => left.slot - right.slot)
    .map((entry) => formatType(entry.type.name));

  const abilityList = pokemonData.abilities
    .slice()
    .sort((left, right) => left.slot - right.slot)
    .map((entry) => capitalizeWords(entry.ability.name.replace(/-/g, " ")));

  const generation =
    generationLabels[speciesData.generation?.name] ||
    capitalizeWords(speciesData.generation?.name || "desconhecida");
  const color =
    colorLabels[speciesData.color?.name] ||
    capitalizeWords(speciesData.color?.name || "desconhecido");
  const habitat =
    habitatLabels[speciesData.habitat?.name] ||
    capitalizeWords(speciesData.habitat?.name || "desconhecido");
  const eggGroups = (speciesData.egg_groups || [])
    .map((group) => capitalizeWords(group.name.replace(/-/g, " ")))
    .join(" / ");
  const legendary = speciesData.is_legendary ? "Sim" : "Não";
  const mythical = speciesData.is_mythical ? "Sim" : "Não";
  const evolution = getEvolutionStage(speciesData.name, evolutionData);

  return {
    id: pokemonData.id,
    name: pokemonData.name,
    displayName: toDisplayName(pokemonData.name),
    type: typeList.join("/"),
    abilities: abilityList,
    generation,
    color,
    habitat,
    eggGroups: eggGroups || "Desconhecido",
    legendary,
    mythical,
    evolution,
  };
}
//Funções do jogo
async function loadRound() {
  clearTimers();
  isLoading = true;
  currentPokemon = null;
  attempts = 0;
  roundLocked = false;
  revealedClues = 1;
  currentLetters = "";
  revealedLetterIndexes = new Set();
  historyList.innerHTML = "";
  pokemonSprite.hidden = true;
  pokemonSprite.removeAttribute("src");
  pokemonResult.querySelector("h3")?.remove();
  pokemonResult.querySelector("p")?.remove();
  gameFeedback.className = "game-feedback";
  gameFeedback.textContent = "Carregando dados da PokeAPI...";
  guessInput.value = "";
  guessInput.disabled = false;
  guessInput.readOnly = false;
  guessButton.disabled = false;
  restartButton.disabled = false;
  guessInput.classList.remove("guess-input--error", "guess-input--success");
  updateAttempts();

  try {
    currentPokemon = await fetchRandomPokemon();
    revealedLetterIndexes = getInitialRevealIndexes(currentPokemon.name, 2);
    currentLetters = buildHangmanMask(
      currentPokemon.name,
      revealedLetterIndexes,
    );
    gameFeedback.textContent = "";
    updateClues();
    guessInput.focus();
  } catch (error) {
    gameFeedback.textContent =
      "Não foi possível carregar a PokeAPI. Tente novamente.";
    gameFeedback.className = "game-feedback game-feedback--error";
  } finally {
    isLoading = false;
  }
}

function clearTimers() {
  if (nextRoundTimeout) {
    clearTimeout(nextRoundTimeout);
    nextRoundTimeout = null;
  }

  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

function updateAttempts() {
  attemptsValue.textContent = `${attempts}/${maxAttempts}`;
}

function updateClues() {
  if (!currentPokemon) {
    clueLetters.textContent = "Nome: ...";
    clueType.textContent = "Tipo: ...";
    clueAbility.textContent = "Habilidade: ...";
    clueGeneration.textContent = "Geração: ...";
    clueColor.textContent = "Cor: ...";
    clueHabitat.textContent = "Habitat: ...";
    clueEggGroups.textContent = "Egg Group: ...";
    clueLegendary.textContent = "Lendário: ...";
    clueMythical.textContent = "Mítico: ...";
    clueEvolution.textContent = "Evolução: ...";
    return;
  }

  clueLetters.textContent = `Nome: ${currentLetters}`;

  clueType.textContent =
    revealedClues >= 2 ? `Tipo: ${currentPokemon.type}` : "Tipo: ?";

  clueAbility.textContent =
    revealedClues >= 3
      ? `Habilidade: ${formatAbilityList(currentPokemon.abilities)}`
      : "Habilidade: ?";

  clueGeneration.textContent =
    revealedClues >= 4 ? `Geração: ${currentPokemon.generation}` : "Geração: ?";

  clueColor.textContent =
    revealedClues >= 5 ? `Cor: ${currentPokemon.color}` : "Cor: ?";

  clueHabitat.textContent =
    revealedClues >= 6 ? `Habitat: ${currentPokemon.habitat}` : "Habitat: ?";

  clueEggGroups.textContent =
    revealedClues >= 7
      ? `Egg Group: ${currentPokemon.eggGroups}`
      : "Egg Group: ?";

  clueLegendary.textContent =
    revealedClues >= 8
      ? `Lendário: ${currentPokemon.legendary}`
      : "Lendário: ?";

  clueMythical.textContent =
    revealedClues >= 9 ? `Mítico: ${currentPokemon.mythical}` : "Mítico: ?";

  clueEvolution.textContent =
    revealedClues >= 10
      ? `Evolução: ${currentPokemon.evolution}`
      : "Evolução: ?";
}
//Partida
function revealLetter(letter) {
  const normalizedLetter = getComparableChar(letter);
  let found = false;

  Array.from(currentPokemon.name).forEach((char, index) => {
    if (getComparableChar(char) === normalizedLetter) {
      revealedLetterIndexes.add(index);
      found = true;
    }
  });

  if (found) {
    currentLetters = buildHangmanMask(
      currentPokemon.name,
      revealedLetterIndexes,
    );
    updateClues();
  }

  return found;
}

function resetInputState() {
  guessInput.value = "";
  if (!guessInput.disabled) {
    guessInput.focus();
  }
}
function showPokemonSprite() {
  pokemonSprite.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${currentPokemon.id}.png`;

  pokemonSprite.alt = currentPokemon.displayName;
  pokemonSprite.hidden = false;
}
function finishRound(win) {
  if (win) {
    pokemonResult.innerHTML = `
      <h3>🎉 Parabéns!</h3>
      <p>O Pokémon era <strong>${currentPokemon.displayName}</strong>.</p>
    `;
  } else {
    pokemonResult.innerHTML = `
      <h3>❌ Fim de jogo!</h3>
      <p>O Pokémon era <strong>${currentPokemon.displayName}</strong>.</p>
    `;
  }

  showPokemonSprite();

  resetInputState();
  lockRoundForNextMatch();
}

function wrongAttempt(type, rawGuess) {
  attempts++;
  revealedClues = Math.min(revealedClues + 1, maxClues);

  updateAttempts();
  updateClues();

  const item = document.createElement("li");
  item.textContent =
    type === "letter" ? `${rawGuess} - letra errada` : `${rawGuess} - errado`;

  item.classList.add("guess-history--error");
  historyList.prepend(item);

  guessInput.classList.remove("guess-input--success");
  guessInput.classList.add("guess-input--error");

  if (attempts >= maxAttempts) {
    finishRound(false);
    return;
  }

  gameFeedback.className = "game-feedback game-feedback--error";
  gameFeedback.textContent =
    type === "letter"
      ? "Letra errada. Nova pista liberada."
      : "Errado. Nova pista liberada.";

  resetInputState();

  setTimeout(() => {
    guessInput.classList.remove("guess-input--error");
  }, inputAnimationTime);
}
function lockRoundForNextMatch() {
  roundLocked = true;
  guessInput.disabled = true;
  guessInput.readOnly = true;
  guessButton.disabled = true;
  restartButton.disabled = true;

  let remainingSeconds = Math.ceil(nextRoundDelay / 1000);

  gameFeedback.className = "game-feedback game-feedback--success";
  gameFeedback.textContent = `Certo! Próxima rodada em ${remainingSeconds} segundos.`;

  countdownInterval = setInterval(() => {
    remainingSeconds -= 1;
    if (remainingSeconds > 0) {
      gameFeedback.textContent = `Certo! Próxima rodada em ${remainingSeconds} segundos.`;
    }
  }, 1000);

  nextRoundTimeout = setTimeout(() => {
    clearTimers();
    loadRound();
  }, nextRoundDelay);
}

function checkGuess() {
  if (roundLocked || isLoading || !currentPokemon) {
    return;
  }

  const guess = normalize(guessInput.value);
  const rawGuess = guessInput.value.trim();

  if (!guess) {
    gameFeedback.textContent = "Digite um nome para tentar.";
    return;
  }

  if (guess.length === 1) {
    const item = document.createElement("li");
    const found = revealLetter(guess);

    if (found) {
      item.textContent = `${rawGuess} - letra certa`;
      historyList.prepend(item);

      gameFeedback.className = "game-feedback game-feedback--success";
      gameFeedback.textContent = `Boa! A letra ${rawGuess.toUpperCase()} apareceu na dica.`;

      guessInput.classList.remove("guess-input--error");
      guessInput.classList.add("guess-input--success");

      resetInputState();

      setTimeout(() => {
        guessInput.classList.remove("guess-input--success");
      }, inputAnimationTime);

      return;
    }

    wrongAttempt("letter", rawGuess);
    return;
  }

  if (guess === currentPokemon.name) {
    const item = document.createElement("li");
    item.textContent = `${rawGuess} - correto!`;
    historyList.prepend(item);

    guessInput.classList.remove("guess-input--error");
    guessInput.classList.add("guess-input--success");

    finishRound(true);

    return;
  }

  wrongAttempt("pokemon", rawGuess);
}
//Eventos/listeners
guessButton.addEventListener("click", checkGuess);

restartButton.addEventListener("click", () => {
  loadRound();
  gameFeedback.textContent = "Quiz reiniciado.";
  gameFeedback.className = "game-feedback";
});

guessInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    checkGuess();
  }
});

loadRound();
