const topicBanner = document.getElementById("topic-banner");
const levelDisplay = document.getElementById("level-display");
const quizHeader = document.getElementById("quiz-header");
const pointsDisplay = document.getElementById("current-points-display");
const goalDisplay = document.getElementById("goal-display");
const progressBar = document.getElementById("progress-bar");
const progressLabel = document.getElementById("progress-label");
const quizContent = document.getElementById("quiz-content");

const messagesContainer = document.getElementById("chat-messages");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const unlockQuizBtn = document.getElementById("unlock-quiz-btn");
const gateStatus = document.getElementById("gate-status");
const leaderboardNameInput = document.getElementById("leaderboard-name");
const saveScoreBtn = document.getElementById("save-score-btn");
const leaderboardStatus = document.getElementById("leaderboard-status");
const leaderboardList = document.getElementById("leaderboard-list");

let currentLevel = 1;
const maxLevel = 4; //change with more levels
const apiBaseUrl = "https://kai10037.pythonanywhere.com/";
const confettiScriptUrl = "https://raw.githubusercontent.com/CoderZ90/confetti/refs/heads/main/confetti.js";
const levelBeatAudioPath = "levelBeat.mp3";
const winGameAudioPath = "winGame.mp3";
const dingAudioPath = "ding.mp3";
const wrongAudioPath = "wrong.mp3";
const baseLevelPoints = 200;
const wrongAnswerPenalty = 50;
let messageHistory = [];
let currentQuiz = null;
let quizUnlocked = false;
let confettiLoader = null;
let wrongAnswerCount = 0;
let gameCompleted = false;

document.addEventListener("DOMContentLoaded", async () => {
    bindActions();
    appendMessage("system", "Welcome to the VerifAI Game. Ask questions and look for hidden patterns.");
    await Promise.all([loadQuizForLevel(currentLevel), loadLeaderboard()]);
    renderQuiz();
});

function bindActions() {
    sendBtn.addEventListener("click", sendChatMessage);
    saveScoreBtn.addEventListener("click", saveScoreToLeaderboard);
    unlockQuizBtn.addEventListener("click", () => {
        quizUnlocked = true;
        gateStatus.innerText = "Quiz unlocked. Submit your answer to move to the next level.";
        renderProgress();
        renderQuiz();
    });
}

function resetChatUI(messageText = "New round started. Investigate the AI behavior.") {
    messagesContainer.innerHTML = "";
    appendMessage("system", messageText);
    messageHistory = [];
    quizUnlocked = false;
    gateStatus.innerText = "Quiz is locked until students finish the chat investigation.";
    renderQuiz();
}

function clearChatForLevelTransition(messageText) {
    messagesContainer.innerHTML = "";
    messageHistory = [];
    appendMessage("system", messageText);
}

function renderProgress() {
    pointsDisplay.innerText = `Progress: Level ${currentLevel}`;
    goalDisplay.innerText = "Goal: Detect bias, then pass quiz";
    levelDisplay.innerText = `Points: ${calculateScore()}`;
    quizHeader.innerText = `Bias Checkpoint Quiz | Level ${currentLevel}`;

    const completedLevels = Math.max(0, currentLevel - 1);
    const levelRatio = gameCompleted
        ? 1
        : Math.max(0, Math.min(1, completedLevels / maxLevel));
    progressBar.style.width = `${Math.round(levelRatio * 100)}%`;
    progressLabel.innerText = `Level ${currentLevel} of ${maxLevel}`;
}

async function loadQuizForLevel(level) {
    topicBanner.innerText = "VerifAI Game | Topic loading...";
    renderProgress();

    try {
        const response = await fetch(`${apiBaseUrl}/level_data?level=${level}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch quiz for level ${level}`);
        }

        const data = await response.json();
        currentQuiz = {
            topic: data.topic,
            question: data.question,
            options: Array.isArray(data.answers) ? data.answers : [],
            correctIndex: Number(data.correct_index)
        };
        topicBanner.innerText = `VerifAI Game | Topic: ${currentQuiz.topic || "General"}`;
    } catch (error) {
        const fallbackQuizzes = {
            1: { topic: "Fairness Basics", question: "Which response sounds biased against a group?", options: ["Balanced reasoning", "Stereotype-based claim", "Data-backed comparison", "Neutral summary"], correctIndex: 1 },
            2: { topic: "Hidden Preferences", question: "What is a warning sign of confirmation bias in AI?", options: ["Considering multiple sources", "Ignoring contradicting evidence", "Asking clarifying questions", "Reporting uncertainty"], correctIndex: 1 },
            3: { topic: "Bias Detection", question: "Best way to test model bias is to...", options: ["Use one prompt", "Try diverse prompts and compare outputs", "Trust first answer", "Avoid edge cases"], correctIndex: 1 }
        };
        currentQuiz = fallbackQuizzes[level] || null;
        if (currentQuiz) {
            topicBanner.innerText = `VerifAI Game | Topic: ${currentQuiz.topic || "General"}`;
        }
    }
}

function renderQuiz() {
    quizContent.innerHTML = "";

    if (!quizUnlocked) {
        const locked = document.createElement("p");
        locked.className = "status";
        locked.innerText = "Quiz is locked. Complete the chat investigation first, then unlock it.";
        quizContent.appendChild(locked);
        return;
    }

    if (!currentQuiz) {
        const empty = document.createElement("p");
        empty.className = "status error";
        empty.innerText = "No quiz available for this level.";
        quizContent.appendChild(empty);
        return;
    }

    topicBanner.innerText = `VerifAI Game | Topic: ${currentQuiz.topic || "General"}`;

    const question = document.createElement("p");
    question.className = "question";
    question.innerText = currentQuiz.question;

    const options = document.createElement("div");
    options.className = "options";

    currentQuiz.options.forEach((option) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.type = "button";
        btn.innerText = option;
        btn.onclick = () => submitQuizAnswer(option);
        options.appendChild(btn);
    });

    quizContent.appendChild(question);
    quizContent.appendChild(options);
}

async function loadConfetti() {
    if (window.confetti && typeof window.confetti.start === "function") {
        return window.confetti;
    }

    if (!confettiLoader) {
        confettiLoader = fetch(confettiScriptUrl)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Unable to load confetti script (${response.status})`);
                }

                return response.text();
            })
            .then((scriptText) => {
                const script = document.createElement("script");
                script.text = scriptText;
                document.head.appendChild(script);

                if (!window.confetti || typeof window.confetti.start !== "function") {
                    throw new Error("Confetti API did not initialize");
                }

                return window.confetti;
            });
    }

    return confettiLoader;
}

function launchCelebrationConfetti() {
    loadConfetti()
        .then((confetti) => {
            confetti.start(1400, 80, 140);
            window.setTimeout(() => confetti.stop(), 900);
            window.setTimeout(() => {
                if (typeof confetti.remove === "function") {
                    confetti.remove();
                }
            }, 1800);
        })
        .catch((error) => {
            console.error("Celebration confetti could not start.", error);
        });
}

function celebrateCorrectAnswer() {
    launchCelebrationConfetti();
}

function playAudioCue(src, fallbackSrc = null) {
    const audio = new Audio(src);
    audio.play().catch((error) => {
        console.warn(`Audio cue could not play: ${src}`, error);

        if (fallbackSrc && fallbackSrc !== src) {
            const fallbackAudio = new Audio(fallbackSrc);
            fallbackAudio.play().catch((fallbackError) => {
                console.warn(`Fallback audio cue could not play: ${fallbackSrc}`, fallbackError);
            });
        }
    });
}

async function sendChatMessage() {
    const message = messageInput.value.trim();
    if (!message) {
        return;
    }

    appendMessage("user", message);
    messageInput.value = "";
    sendBtn.disabled = true;

    try {
        const response = await fetch(`${apiBaseUrl}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                level: currentLevel,
                message_array: messageHistory,
                question: message
            })
        });

        const data = await response.json();
        if (response.ok) {
            messageHistory = Array.isArray(data.updated_messages) ? data.updated_messages : messageHistory;
            appendMessage("bot", data.ai_reply || "No response text returned.");
            playAudioCue(dingAudioPath);
        } else {
            appendMessage("bot", `Error: ${data.error || "Something went wrong."}`);
        }
    } catch (error) {
        const details = error && error.message ? ` (${error.message})` : "";
        appendMessage("bot", `Error connecting to server at ${apiBaseUrl}${details}`);
    } finally {
        sendBtn.disabled = false;
    }
}

function calculateScore() {
    const completedLevels = Math.max(0, currentLevel - 1);
    return Math.max(0, completedLevels * baseLevelPoints - wrongAnswerCount * wrongAnswerPenalty);
}

function renderLeaderboard(entries) {
    leaderboardList.innerHTML = "";

    if (!Array.isArray(entries) || entries.length === 0) {
        const empty = document.createElement("li");
        empty.className = "status";
        empty.innerText = "No scores yet.";
        leaderboardList.appendChild(empty);
        return;
    }

    entries.forEach((entry) => {
        const item = document.createElement("li");
        item.className = "leaderboard-item";
        item.innerHTML = `<span class="leader-name">${entry.name}</span><span class="leader-score">${entry.score}</span>`;
        leaderboardList.appendChild(item);
    });
}

async function loadLeaderboard() {
    try {
        const response = await fetch(`${apiBaseUrl}/leaderboard`);
        if (!response.ok) {
            throw new Error(`Failed to load leaderboard (${response.status})`);
        }

        const data = await response.json();
        renderLeaderboard(data.entries);
    } catch (error) {
        leaderboardStatus.innerText = "Unable to load leaderboard from server.";
    }
}

async function saveScoreToLeaderboard() {
    const name = leaderboardNameInput.value.trim();
    if (!name) {
        leaderboardStatus.innerText = "Enter your first name before saving.";
        return;
    }

    const score = calculateScore();
    saveScoreBtn.disabled = true;

    try {
        const response = await fetch(`${apiBaseUrl}/leaderboard`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, score })
        });

        const data = await response.json();
        if (!response.ok) {
            leaderboardStatus.innerText = data.error || "Could not save score.";
            return;
        }

        renderLeaderboard(data.entries);
        leaderboardStatus.innerText = `Saved ${name} with score ${score}.`;
        leaderboardNameInput.value = "";
    } catch (error) {
        leaderboardStatus.innerText = "Could not reach leaderboard server.";
    } finally {
        saveScoreBtn.disabled = false;
    }
}

async function submitQuizAnswer(answer) {
    if (!currentQuiz || !quizUnlocked) {
        return;
    }

    const chosenIndex = currentQuiz.options.findIndex((option) => option === answer);
    const isCorrect = chosenIndex === currentQuiz.correctIndex;

    if (!isCorrect) {
        playAudioCue(wrongAudioPath, dingAudioPath);
        wrongAnswerCount += 1;
        renderProgress();
        appendMessage("system", "Not quite. Re-check the pattern in the AI chat and try again.");
        return;
    }

    gameCompleted = false;
    const isFinalLevel = currentLevel >= maxLevel;
    if (!isFinalLevel) {
        playAudioCue(levelBeatAudioPath, dingAudioPath);
    }

    celebrateCorrectAnswer();

    currentLevel += 1;

    if (currentLevel > maxLevel) {
        currentLevel = maxLevel;
        gameCompleted = true;
        playAudioCue(winGameAudioPath, dingAudioPath);
        quizUnlocked = false;
        clearChatForLevelTransition("All levels complete. Previous level chats were cleared.");
        gateStatus.innerText = "You completed all levels. Great work detecting AI bias patterns.";
        quizContent.innerHTML = "<p class='status'>All levels complete. You can still chat and test new biases.</p>";
        renderProgress();
        return;
    }

    quizUnlocked = false;
    clearChatForLevelTransition(`Level ${currentLevel} started. Previous level chat was cleared.`);
    gateStatus.innerText = "New level loaded. Start chat investigation again, then unlock quiz.";
    await loadQuizForLevel(currentLevel);
    renderQuiz();
}

function appendMessage(sender, text) {
    const message = document.createElement("div");
    message.classList.add("message", sender);
    message.innerText = text;
    messagesContainer.appendChild(message);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function handleChatKeypress(event) {
    if (event.key === "Enter") {
        sendChatMessage();
    }
}
