# server.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from askGroq import send_ai_message  # Import your reusable function
from readcsv import read_csv

app = Flask(__name__)
CORS(app)

level_data = read_csv('testData.csv')

@app.route("/chat", methods=["POST"])
def chat():
    """
    POST JSON body should include:
    {
        "system_prompt": "generic system prompt",
        "level": 1,
        "message_array": [{"role": "user", "content": "Hi"}],
        "question": "User's new question"
    }
    """
    try:
        data = request.get_json()

        system_prompt = data.get("system_prompt", "")
        level = data.get("level")
        message_array = data.get("message_array", [])
        question = data.get("question", "")

        # Validate required fields
        if not system_prompt or not question or level is None:
            return jsonify({"error": "system_prompt, level, and question are required"}), 400

        try:
            level_int = int(level)
        except (TypeError, ValueError):
            return jsonify({"error": "level must be an integer"}), 400

        index = level_int - 1
        if index < 0 or index >= len(level_data):
            return jsonify({"error": "level out of range"}), 404

        # Bias text is stored in CSV column 2 (index 1) for each level row.
        bias = level_data[index][1]

        # Call the AI using imported function
        ai_reply, updated_messages = send_ai_message(system_prompt, bias, message_array, question)

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


if __name__ == "__main__":
    app.run(debug=True, port=5000)