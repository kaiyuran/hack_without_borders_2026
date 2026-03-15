# server.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from askGroq import send_ai_message  # Import your reusable function
from readcsv import read_csv
from pathlib import Path
import re

app = Flask(__name__)
CORS(app)

level_data = read_csv('testData.csv') #make sure this is /home/KAI10037/mysite on pythonanywhere
leaderboard_file = Path(__file__).with_name("leaderboard.txt")
sample_leaderboard = [
    ("Ava", 980),
    ("Noah", 910),
    ("Mia", 870),
    ("Liam", 820),
    ("Zoe", 760)
]

SYSTEM_PROMPT = (
    "You are Jerry, a conversational AI that interacts with a user in a neutral and informative way. "
    "Your responses should be concise and limited to 5 sentences. "
    "Be aware that a bias may be applied, but do not include any bias from your own knowledge. "
    "Focus on answering clearly, respectfully, and helpfully."
)


def initialize_leaderboard_file() -> None:
    if leaderboard_file.exists():
        return

    with leaderboard_file.open("w", encoding="utf-8") as f:
        for name, score in sample_leaderboard:
            f.write(f"{name},{score}\n")


def read_leaderboard() -> list:
    best_entries = {}

    if not leaderboard_file.exists():
        initialize_leaderboard_file()

    with leaderboard_file.open("r", encoding="utf-8") as f:
        for raw_line in f:
            line = raw_line.strip()
            if not line:
                continue

            parts = line.split(",", 1)
            if len(parts) != 2:
                continue

            name = parts[0].strip()
            try:
                score = int(parts[1].strip())
            except ValueError:
                continue

            key = name.casefold() #use casefold for weird names
            existing = best_entries.get(key)
            if existing is None or score > existing["score"]: #check if this name already exists with a lower score, if so replace it
                best_entries[key] = {"name": name, "score": score}

    entries = list(best_entries.values())
    entries.sort(key=lambda item: item["score"], reverse=True)
    return entries


def write_leaderboard(entries: list) -> None:
    with leaderboard_file.open("w", encoding="utf-8") as f:
        for entry in entries:
            f.write(f"{entry['name']},{entry['score']}\n")


def update_leaderboard_entry(name: str, score: int) -> list:
    entries = read_leaderboard()
    key = name.casefold()

    replaced = False
    for entry in entries:
        if entry["name"].casefold() == key:
            if score > entry["score"]:
                entry["score"] = score
            replaced = True
            break

    if not replaced:
        entries.append({"name": name, "score": score})

    entries.sort(key=lambda item: item["score"], reverse=True)
    write_leaderboard(entries)
    return entries


initialize_leaderboard_file()

@app.route("/chat", methods=["POST"])
def chat():
    """
    POST JSON body should include:
    {
        "level": 1,
        "message_array": [{"role": "user", "content": "Hi"}],
        "question": "User's new question"
    }
    """
    try:
        data = request.get_json()

        level = data.get("level")
        message_array = data.get("message_array", [])
        question = data.get("question", "")

        # Validate required fields
        if not question or level is None:
            return jsonify({"error": "level and question are required"}), 400

        try:
            level_int = int(level)
        except (TypeError, ValueError):
            return jsonify({"error": "level must be an integer"}), 400

        index = level_int - 1
        if index < 0 or index >= len(level_data):
            return jsonify({"error": "level out of range"}), 404

        # Bias text is stored in CSV column 2 (index 1) for each level row.
        bias = level_data[index][1]

        # Call the AI using imported function from askGroq.py
        ai_reply, updated_messages = send_ai_message(SYSTEM_PROMPT, bias, message_array, question)

        return jsonify({
            "ai_reply": ai_reply,
            "updated_messages": updated_messages
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/level_data", methods=["GET"])
def get_level_data():
    try:
        level_str = request.args.get("level")
        if level_str is None:
            raise ValueError("Missing level")
        level = int(level_str)
    except (TypeError, ValueError):
        return jsonify({"error": "level must be an integer"}), 400

    index = level - 1
    if index < 0 or index >= len(level_data):
        return jsonify({"error": "level out of range"}), 404

    # CSV columns: 0=topic, 1=bias, 2=question, 3-6=answer options, 7=correct answer index
    row = level_data[index] 
    answers = [row[3], row[4], row[5], row[6]]
    raw_correct_index = row[7]

    # CSV stores answer positions as 1-based (1..N). Convert to zero-based for frontend arrays.
    if isinstance(raw_correct_index, int) and 1 <= raw_correct_index <= len(answers):
        correct_index = raw_correct_index - 1
    else:
        correct_index = raw_correct_index

    return jsonify({
        "topic": row[0],
        "question": row[2],
        "answers": answers,
        "correct_index": correct_index
    })


@app.route("/leaderboard", methods=["GET"])
def get_leaderboard():
    entries = read_leaderboard()
    return jsonify({"entries": entries[:20]})


@app.route("/leaderboard", methods=["POST"])
def add_leaderboard_entry():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip().title()
    score_value = data.get("score")

    if not re.fullmatch(r"[A-Za-z][A-Za-z'-]{0,19}", name):
        return jsonify({"error": "name must be a first name using letters, apostrophe, or hyphen"}), 400

    if score_value is None:
        return jsonify({"error": "score is required"}), 400

    try:
        score = int(score_value)
    except (TypeError, ValueError):
        return jsonify({"error": "score must be an integer"}), 400

    if score < 0:
        return jsonify({"error": "score must be non-negative"}), 400

    updated_entries = update_leaderboard_entry(name, score)
    return jsonify({"entries": updated_entries[:20]})

# easy way to clear the leaderboard for testing or weekly reset, not accessible from game UI
@app.route("/leaderboard/clear", methods=["GET"])
def clear_leaderboard():
    write_leaderboard([])
    return jsonify({"message": "leaderboard cleared", "entries": []})


if __name__ == "__main__":
    app.run(debug=True, port=5000)