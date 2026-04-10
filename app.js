const searchBar = document.getElementById("searchBar");
const charactersList = document.getElementById("charactersList");
const resultsStatus = document.getElementById("resultsStatus");
const themeToggle = document.getElementById("themeToggle");
const filterChips = Array.from(document.querySelectorAll(".filter-chip"));
const currentYear = new Date().getFullYear();
const API_URL = "https://hp-api.onrender.com/api/characters";
const DEBOUNCE_DELAY = 150;

let hpCharacters = [];
let debounceTimer;
let currentTheme = "light";
let activeFilter = "";

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

const updateThemeToggle = () => {
  const isDark = currentTheme === "dark";
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.setAttribute(
    "aria-label",
    isDark ? "Switch to light mode" : "Switch to dark mode",
  );
  themeToggle.querySelector(".theme-toggle__emoji").textContent = isDark ? "☀️" : "🌙";
  themeToggle.querySelector(".theme-toggle__label").textContent = isDark ? "Light" : "Dark";
};

const updateFilterChips = () => {
  filterChips.forEach((chip) => {
    const isActive = chip.dataset.filter === activeFilter;
    chip.classList.toggle("is-active", isActive);
    chip.setAttribute("aria-pressed", String(isActive));
  });
};

const applyTheme = (theme) => {
  currentTheme = theme;
  document.body.classList.toggle("theme-dark", theme === "dark");
  updateThemeToggle();
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

const applyFilters = () => {
  const normalizedQuery = searchBar.value.trim().toLowerCase();

  const filteredCharacters = hpCharacters.filter((character) => {
    const name = (character.name || "").toLowerCase();
    const house = (character.house || "").toLowerCase();
    const matchesSearch = !normalizedQuery || name.includes(normalizedQuery) || house.includes(normalizedQuery);
    const matchesQuickFilter = !activeFilter || house === activeFilter;

    return matchesSearch && matchesQuickFilter;
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
    updateFilterChips();
    applyFilters();
  } catch (err) {
    console.error(err);
    charactersList.innerHTML =
      '<li class="empty-state shadow">Unable to load characters right now. Please try again later.</li>';
    renderStatus("Unable to load characters.");
  }
};

searchBar.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    applyFilters();
  }, DEBOUNCE_DELAY);
});

filterChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    activeFilter = chip.dataset.filter;
    updateFilterChips();
    applyFilters();
  });
});

themeToggle.addEventListener("click", () => {
  applyTheme(currentTheme === "dark" ? "light" : "dark");
});

applyTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
updateFilterChips();
loadCharacters();
