const searchBar = document.getElementById("searchBar");
const charactersList = document.getElementById("charactersList");
const resultsStatus = document.getElementById("resultsStatus");
const themeToggle = document.getElementById("themeToggle");
const sortSelect = document.getElementById("sortSelect");
const characterModal = document.getElementById("characterModal");
const modalContent = document.getElementById("modalContent");
const closeModalButton = document.getElementById("closeModalButton");
const filterChips = Array.from(document.querySelectorAll(".filter-chip"));
const currentYear = new Date().getFullYear();
const API_URL = "https://hp-api.onrender.com/api/characters";
const DEBOUNCE_DELAY = 150;

let hpCharacters = [];
let debounceTimer;
let currentTheme = "light";
let activeFilter = "";
let activeSort = "default";
let activeModalCharacter = null;

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

const formatLabel = (value = "") =>
  value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();

const getCharacterAge = (yearOfBirth) => {
  if (!Number.isFinite(yearOfBirth)) {
    return "";
  }

  return currentYear - yearOfBirth;
};

const hasMeaningfulValue = (value) => {
  if (Array.isArray(value)) {
    return value.some(hasMeaningfulValue);
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (value && typeof value === "object") {
    return Object.values(value).some(hasMeaningfulValue);
  }

  return false;
};

const getAdditionalCharacterDetails = (character) => {
  const excludedKeys = new Set(["name", "house", "image", "id", "yearOfBirth"]);

  return Object.entries(character).filter(([key, value]) => {
    if (excludedKeys.has(key)) {
      return false;
    }

    return hasMeaningfulValue(value);
  });
};

const buildDetailList = (items) => {
  if (!items.length) {
    return "";
  }

  return `
    <div class="character-modal__detail">
      <dt>${escapeHtml(items[0].title)}</dt>
      <dd>
        <ul class="character-modal__list">
          ${items
            .map(
              ({ label, value }) =>
                `<li><strong>${escapeHtml(label)}:</strong> ${formatDetailValue(value)}</li>`,
            )
            .join("")}
        </ul>
      </dd>
    </div>
  `;
};

const buildGroupedDetails = (character) => {
  const profileItems = [
    ["Species", character.species],
    ["Gender", character.gender],
    ["Date of birth", character.dateOfBirth],
    ["Year of birth", character.yearOfBirth],
    ["Wizard", character.wizard],
  ].filter(([, value]) => hasMeaningfulValue(value));

  const schoolItems = [
    ["House", character.house],
    ["Hogwarts student", character.hogwartsStudent],
    ["Hogwarts staff", character.hogwartsStaff],
  ].filter(([, value]) => hasMeaningfulValue(value));

  const familyItems = [
    ["Ancestry", character.ancestry],
    ["Eye colour", character.eyeColour],
    ["Hair colour", character.hairColour],
    ["Patronus", character.patronus],
    ["Actor", character.actor],
    ["Alternate actors", character.alternate_actors],
  ].filter(([, value]) => hasMeaningfulValue(value));

  const wandItems = [
    ["Wood", character.wand?.wood],
    ["Core", character.wand?.core],
    ["Length", character.wand?.length ? `${character.wand.length} in` : ""],
  ].filter(([, value]) => hasMeaningfulValue(value));

  const alternateNames = Array.isArray(character.alternate_names)
    ? character.alternate_names.filter(hasMeaningfulValue)
    : [];

  const detailSections = [
    buildDetailList(
      profileItems.map(([label, value]) => ({ title: "Profile", label, value })),
    ),
    buildDetailList(
      schoolItems.map(([label, value]) => ({ title: "Hogwarts", label, value })),
    ),
    buildDetailList(
      familyItems.map(([label, value]) => ({ title: "Background", label, value })),
    ),
    buildDetailList(
      wandItems.map(([label, value]) => ({ title: "Wand", label, value })),
    ),
    alternateNames.length
      ? `
        <div class="character-modal__detail">
          <dt>Alternate names</dt>
          <dd>
            <ul class="character-modal__list">
              ${alternateNames
                .map((name) => `<li>${escapeHtml(String(name))}</li>`)
                .join("")}
            </ul>
          </dd>
        </div>
      `
      : "",
  ];

  const coveredKeys = new Set([
    "name",
    "house",
    "image",
    "id",
    "yearOfBirth",
    "species",
    "gender",
    "dateOfBirth",
    "wizard",
    "hogwartsStudent",
    "hogwartsStaff",
    "ancestry",
    "eyeColour",
    "hairColour",
    "patronus",
    "actor",
    "alternate_actors",
    "alternate_names",
    "wand",
  ]);

  const remainingDetails = Object.entries(character)
    .filter(([key, value]) => !coveredKeys.has(key) && hasMeaningfulValue(value))
    .map(
      ([key, value]) => `
        <div class="character-modal__detail">
          <dt>${escapeHtml(formatLabel(key))}</dt>
          <dd>${formatDetailValue(value)}</dd>
        </div>
      `,
    )
    .join("");

  return [...detailSections, remainingDetails].join("");
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

const formatDetailValue = (value) => {
  if (Array.isArray(value)) {
    const filteredValues = value.filter(hasMeaningfulValue);
    return filteredValues.length
      ? filteredValues.map((item) => escapeHtml(String(item))).join(", ")
      : "Not available";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "object" && value !== null) {
    return escapeHtml(JSON.stringify(value));
  }

  if (value === null || value === undefined || value === "") {
    return "Not available";
  }

  return escapeHtml(String(value));
};

const createCharacterCard = (character, index) => {
  const name = escapeHtml(character.name || "Unknown character");
  const house = escapeHtml(character.house || "Unknown house");
  const image = character.image || "";
  const age = getCharacterAge(character.yearOfBirth);
  const houseText = character.house ? `House: ${house}` : "No house listed";
  const extraDetails = getAdditionalCharacterDetails(character);
  const hasMoreInfo = extraDetails.length > 0;

  return `
        <li>
          <button
            type="button"
            class="character shadow${hasMoreInfo ? " character--interactive" : ""}"
            data-character-index="${index}"
            aria-label="${hasMoreInfo ? `Open more details about ${name}` : `No more information available for ${name}` }"
          >
            <div class="character__content">
                <h2>${name}${age ? ` <span class="italics">(${age})</span>` : ""}</h2>
                <p>${houseText}</p>
                <span class="character__hint">${
                  hasMoreInfo
                    ? "Tap to view full character details"
                    : "No more information available for this character"
                }</span>
            </div>
            ${
              image
                ? `<img src="${image}" alt="${name}" loading="lazy" width="80" height="100" />`
                : ""
            }
          </button>
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

  charactersList.innerHTML = characters
    .map((character, index) => createCharacterCard(character, index))
    .join("");
  renderStatus(
    `${characters.length} character${characters.length === 1 ? "" : "s"} shown.`,
  );
};

const renderModalContent = (character) => {
  const image = character.image
    ? `<img class="character-modal__image" src="${character.image}" alt="${escapeHtml(character.name || "Character image")}" loading="lazy" width="160" height="200" />`
    : "";
  const details = buildGroupedDetails(character);

  modalContent.innerHTML = `
    <div class="character-modal__header">
      ${image}
      <div>
        <p class="eyebrow">Character profile</p>
        <h2 id="modalTitle">${escapeHtml(character.name || "Unknown character")}</h2>
        <p class="character-modal__subtitle">${escapeHtml(character.house || "No house listed")}</p>
      </div>
    </div>
    <dl class="character-modal__details">${details}</dl>
  `;
};

const openModal = (character) => {
  activeModalCharacter = character;
  renderModalContent(character);
  characterModal.hidden = false;
  document.body.classList.add("modal-open");
  closeModalButton.focus();
};

const closeModal = () => {
  activeModalCharacter = null;
  characterModal.hidden = true;
  document.body.classList.remove("modal-open");
};

const sortCharacters = (characters) => {
  const sortedCharacters = [...characters];

  const getName = (character) => (character.name || "").toLowerCase();
  const getHouse = (character) => (character.house || "zzz").toLowerCase();

  switch (activeSort) {
    case "name-asc":
      sortedCharacters.sort((a, b) => getName(a).localeCompare(getName(b)));
      break;
    case "name-desc":
      sortedCharacters.sort((a, b) => getName(b).localeCompare(getName(a)));
      break;
    case "house-asc":
      sortedCharacters.sort((a, b) => {
        const houseComparison = getHouse(a).localeCompare(getHouse(b));
        return houseComparison || getName(a).localeCompare(getName(b));
      });
      break;
    case "house-desc":
      sortedCharacters.sort((a, b) => {
        const houseComparison = getHouse(b).localeCompare(getHouse(a));
        return houseComparison || getName(a).localeCompare(getName(b));
      });
      break;
    default:
      break;
  }

  return sortedCharacters;
};

const getVisibleCharacters = () => {
  const normalizedQuery = searchBar.value.trim().toLowerCase();

  const filteredCharacters = hpCharacters.filter((character) => {
    const name = (character.name || "").toLowerCase();
    const house = (character.house || "").toLowerCase();
    const matchesSearch =
      !normalizedQuery ||
      name.includes(normalizedQuery) ||
      house.includes(normalizedQuery);
    const matchesQuickFilter = !activeFilter || house === activeFilter;

    return matchesSearch && matchesQuickFilter;
  });

  return sortCharacters(filteredCharacters);
};

const applyFilters = () => {
  displayCharacters(getVisibleCharacters());
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

sortSelect.addEventListener("change", (event) => {
  activeSort = event.target.value;
  applyFilters();
});

charactersList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-character-index]");

  if (!card) {
    return;
  }

  const character = getVisibleCharacters()[Number(card.dataset.characterIndex)];

  if (!character) {
    return;
  }

  const extraDetails = getAdditionalCharacterDetails(character);

  if (!extraDetails.length) {
    renderStatus(`No more information available for ${character.name || "this character"}.`);
    return;
  }

  openModal(character);
});

themeToggle.addEventListener("click", () => {
  applyTheme(currentTheme === "dark" ? "light" : "dark");
});

closeModalButton.addEventListener("click", closeModal);
characterModal.addEventListener("click", (event) => {
  if (event.target.hasAttribute("data-close-modal")) {
    closeModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !characterModal.hidden) {
    closeModal();
  }
});

applyTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
updateFilterChips();
loadCharacters();
