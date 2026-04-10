const searchBar = document.getElementById("searchBar");
const charactersList = document.getElementById("charactersList");
const resultsStatus = document.getElementById("resultsStatus");
const currentYear = new Date().getFullYear();
const API_URL = "https://hp-api.onrender.com/api/characters";
const DEBOUNCE_DELAY = 150;

let hpCharacters = [];
let debounceTimer;

const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (char) => {
    const chars = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return chars[char];
  });

const getCharacterAge = (yearOfBirth) => {
  if (!Number.isFinite(yearOfBirth)) {
    return "";
  }

  return currentYear - yearOfBirth;
};

const renderStatus = (message) => {
  resultsStatus.textContent = message;
};

const createCharacterCard = (character) => {
  const name = escapeHtml(character.name || "Unknown character");
  const house = escapeHtml(character.house || "Unknown house");
  const image = character.image || "";
  const age = getCharacterAge(character.yearOfBirth);
  const houseText = character.house ? `House: ${house}` : "No house listed";

  return `
        <li class="character shadow">
            <div class="character__content">
                <h2>${name}${age ? ` <span class="italics">(${age})</span>` : ""}</h2>
                <p>${houseText}</p>
            </div>
            ${
              image
                ? `<img src="${image}" alt="${name}" loading="lazy" width="80" height="100" />`
                : ""
            }
        </li>
    `;
};

const displayCharacters = (characters) => {
  if (!characters.length) {
    charactersList.innerHTML =
      '<li class="empty-state shadow">No matching characters found.</li>';
    renderStatus("No matching characters found.");
    return;
  }

  charactersList.innerHTML = characters.map(createCharacterCard).join("");
  renderStatus(
    `${characters.length} character${characters.length === 1 ? "" : "s"} shown.`,
  );
};

const filterCharacters = (query) => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    displayCharacters(hpCharacters);
    return;
  }

  const filteredCharacters = hpCharacters.filter((character) => {
    const name = (character.name || "").toLowerCase();
    const house = (character.house || "").toLowerCase();

    return name.includes(normalizedQuery) || house.includes(normalizedQuery);
  });

  displayCharacters(filteredCharacters);
};

const loadCharacters = async () => {
  renderStatus("Loading characters...");

  try {
    const res = await fetch(API_URL);

    if (!res.ok) {
      throw new Error(`Request failed with status ${res.status}`);
    }

    hpCharacters = await res.json();
    displayCharacters(hpCharacters);
  } catch (err) {
    console.error(err);
    charactersList.innerHTML =
      '<li class="empty-state shadow">Unable to load characters right now. Please try again later.</li>';
    renderStatus("Unable to load characters.");
  }
};

searchBar.addEventListener("input", (event) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    filterCharacters(event.target.value);
  }, DEBOUNCE_DELAY);
});

loadCharacters();
