const guesses = [];

const MAX_GUESSES = 6;
let gameOver = false;

const guessInput = document.getElementById("guessInput");
const guessButton = document.getElementById("guessButton");
const message = document.getElementById("message");
const countryList = document.getElementById("countryList");
const unitSelect = document.getElementById("unitSelect");
const guessList = document.getElementById("guessList");
const stats = document.getElementById("stats");
const shareButton = document.getElementById("shareButton");
const shareMessage = document.getElementById("shareMessage");
const countdown = document.getElementById("countdown");
const reveal = document.getElementById("reveal");

// Fill the autocomplete list from the data
for (const country of countries) {
    const option = document.createElement("option");
    option.value = country.name;
    countryList.appendChild(option);
}

function findCountry(name) {
    return countries.find(function (c) {
        return c.name.toLowerCase() === name.trim().toLowerCase();
    });
}

const START_DATE = new Date(2026, 0, 1); // January 1, 2026 (months start at 0)

function getDayNumber() {
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.floor((todayMidnight - START_DATE) / (1000 * 60 * 60 * 24));
}

function getDailyAnswer() {
    return countries[getDayNumber() % countries.length];
}

const answer = getDailyAnswer();
const today = getDayNumber();

function toRadians(degrees) {
    return degrees * Math.PI / 180;
}

// Haversine formula: distance in km between two points on a sphere
function getDistance(a, b) {
    const R = 6371; // Earth's radius in km
    const dLat = toRadians(b.lat - a.lat);
    const dLon = toRadians(b.lon - a.lon);

    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) *
        Math.sin(dLon / 2) ** 2;

    return Math.round(R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

// Compass bearing (0-360 degrees) from point a toward point b
function getBearing(a, b) {
    const dLon = toRadians(b.lon - a.lon);
    const lat1 = toRadians(a.lat);
    const lat2 = toRadians(b.lat);

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    const degrees = Math.atan2(y, x) * 180 / Math.PI;
    return (degrees + 360) % 360;
}

// Turn a bearing into one of 8 arrows
function getArrow(bearing) {
    const arrows = ["⬆️", "↗️", "➡️", "↘️", "⬇️", "↙️", "⬅️", "↖️"];
    return arrows[Math.round(bearing / 45) % 8];
}

function formatDistance(km) {
    if (unitSelect.value === "mi") {
        return Math.round(km * 0.621371) + " mi";
    }
    return km + " km";
}

function getPopulationClue(guess, target) {
    if (guess.population === target.population) return "✅ Same population";
    const ratio = guess.population / target.population;
    if (ratio > 1) {
        return ratio > 2 ? "🔽 Answer is much smaller" : "🔽 Answer is smaller";
    }
    return ratio < 0.5 ? "🔼 Answer is much bigger" : "🔼 Answer is bigger";
}

function renderGuesses() {
    guessList.innerHTML = "";

    for (const g of guesses.slice().reverse()) {
        const row = document.createElement("div");
        row.className = "guess-row";

        const continentMatch = g.country.continent === answer.continent;

        row.innerHTML =
            "<strong>" + g.country.name + "</strong>" +
            "<span>" + formatDistance(g.distance) + " " + g.arrow + "</span>" +
            "<span class='" + (continentMatch ? "match" : "miss") + "'>" +
                (continentMatch ? "✅ " : "❌ ") + g.country.continent +
            "</span>" +
            "<span>" + getPopulationClue(g.country, answer) + "</span>";
        
        guessList.appendChild(row);
    }
}

function updateCountdown() {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const diff = tomorrow - now;

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    countdown.textContent = "Next puzzle in " +
        String(hours).padStart(2, "0") + ":" +
        String(minutes).padStart(2, "0") + ":" +
        String(seconds).padStart(2, "0");
}

function showReveal() {
    reveal.innerHTML =
        "<h2>" + answer.name + "</h2>" +
        "<p>🌍 " + answer.continent + "</p>" +
        "<p>👥 " + answer.population.toLocaleString() + " people</p>";
    reveal.style.display = "block";
}

function endGame(won) {
    gameOver = true;
    guessInput.disabled = true;
    guessButton.disabled = true;

    if (won) {
        message.textContent = "Correct! It was " + answer.name + "! 🎉";
    } else {
        message.textContent = "Out of guesses! The answer was " + answer.name + ".";
    }
        shareButton.style.display = "inline-block";     updateCountdown();
    setInterval(updateCountdown, 1000);
    showReveal();
}

function makeGuess(country) {
    return {
        country: country,
        distance: getDistance(country, answer),
        arrow: getArrow(getBearing(country, answer))
    };
}

function saveProgress() {
    try {
        const data = {
            day: today,
            guesses: guesses.map(function (g) { return g.country.name; })
        };
        localStorage.setItem("Bearings-progress", JSON.stringify(data));
    } catch (e) {
        // Storage can be blocked (e.g. private browsing); the game still works without it
    }
}

function loadProgress() {
    try {
        const saved = JSON.parse(localStorage.getItem("Bearings-progress"));
        if (!saved || saved.day !== today) return;

        for (const name of saved.guesses) {
            const country = findCountry(name);
            if (country) guesses.push(makeGuess(country));
        }
        renderGuesses();

        const last = guesses[guesses.length - 1];
        if (last && last.distance === 0) {
            endGame(true);
        } else if (guesses.length >= MAX_GUESSES) {
            endGame(false);
        }
    } catch (e) {
        // Corrupted or missing data: just start fresh
    }
}

function loadStats() {
    const defaults = { played: 0, wins: 0, streak: 0, maxStreak: 0, lastWonDay: -1 };
    try {
        return JSON.parse(localStorage.getItem("Bearings-stats")) || defaults;
    } catch (e) {
        return defaults;
    }
}

function showStats() {
    const s = loadStats();
    // If the last win wasn't yesterday or today, the streak is already broken
    const streak = s.lastWonDay >= today - 1 ? s.streak : 0;
    stats.textContent =
        "🔥 Streak: " + streak +
        " | Best: " + s.maxStreak +
        " | Played: " + s.played +
        " | Wins: " + s.wins;
}

function recordResult(won) {
    const s = loadStats();
    s.played++;

    if (won) {
        s.wins++;
        s.streak = (s.lastWonDay === today - 1) ? s.streak + 1 : 1;
        s.lastWonDay = today;
        s.maxStreak = Math.max(s.maxStreak, s.streak);
    } else {
        s.streak = 0;
    }

    try {
        localStorage.setItem("Bearings-stats", JSON.stringify(s));
    } catch (e) {}
    showStats();
}

function getSquare(distance) {
    if (distance === 0) return "🟩";
    if (distance <= 3000) return "🟨";
    return "🟥";
}

function buildShareText() {
    const won = guesses.length > 0 && guesses[guesses.length - 1].distance === 0;
    const score = won ? guesses.length : "X";
    const squares = guesses.map(function (g) { return getSquare(g.distance); }).join("");
    return "Bearings #" + today + " " + score + "/" + MAX_GUESSES + "\n" + squares;
}

function shareResult() {
    const text = buildShareText();
    navigator.clipboard.writeText(text).then(function () {
        shareMessage.textContent = "Copied to clipboard!";
    }).catch(function () {
        shareMessage.textContent = "Couldn't copy. Here it is:\n" + text;
    });
}

function submitGuess() {
    if (gameOver) return;
    
    const country = findCountry(guessInput.value);

    if (!country) {
        message.textContent = "That's not in the country list.";
        return;
    }

    if (guesses.some(function (g) { return g.country === country; })) {
        message.textContent = "You already guessed " + country.name + ".";
        return;
    }

        guesses.push(makeGuess(country));
    renderGuesses();
    saveProgress();

    if (country === answer) {
        endGame(true);
        recordResult(true);
    } else if (guesses.length >= MAX_GUESSES) {
        endGame(false);
        recordResult(false);
    } else {
        message.textContent = "Guess " + (guesses.length + 1) + " of " + MAX_GUESSES;
    }

    guessInput.value = "";
    guessInput.focus();
}

guessButton.addEventListener("click", submitGuess);
shareButton.addEventListener("click", shareResult);

guessInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        submitGuess();
    }
});

unitSelect.addEventListener("change", function () {
    try {
        localStorage.setItem("Bearings-unit", unitSelect.value);
    } catch (e) {}
    renderGuesses();
});

// Startup: restore the saved unit, today's guesses, and the stats line
try {
    unitSelect.value = localStorage.getItem("Bearings-unit") || "km";
} catch (e) {}
loadProgress();
showStats();
