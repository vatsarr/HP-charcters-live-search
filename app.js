const searchBar = document.getElementById("searchBar");
const charactersList = document.getElementById("charactersList");
let hpCharacters = [];

const loadCharacters = async () => {
    try {
        const res = await fetch("https://hp-api.onrender.com/api/characters");
        hpCharacters = await res.json();
        displayCharacters(hpCharacters);
    } catch (err) {
        console.error(err);
    }
};

const displayCharacters = (characters) => {
    const htmlString = characters
        .map((character) => {
            if (character.house === "" && character.image === "") {
                return `
            <li class="character shadow">
                <h2>${character.name}</h2>
            </li>
        `;
            } else if (character.image === "") {
                return `
            <li class="character shadow">
                <h2>${character.name}</h2>
                <p>House: ${character.house}</p>
            </li>
        `;
            } else if (character.house === "") {
                return `
            <li class="character shadow">
                <h2>${character.name}</h2>
                <img src="${character.image}"></img>
            </li>
        `;
            } else {
                return `
            <li class="character shadow">
                <h2>${character.name}</h2>
                <p>House: ${character.house}</p>
                <img src="${character.image}"></img>
            </li>
        `;
            }
        })
        .join("");
    charactersList.innerHTML = htmlString;
};

loadCharacters();

searchBar.addEventListener("keyup", (e) => {
    const searchString = e.target.value;
    const filteredCharacters = hpCharacters.filter((character) => {
        return (
            character.name.toLowerCase().includes(searchString) ||
            character.house.toLowerCase().includes(searchString)
        );
    });
    displayCharacters(filteredCharacters);
});
