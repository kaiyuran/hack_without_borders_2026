# server.py
from flask import Flask, request, jsonify
from Backend.askGroq import send_ai_message  # Import your reusable function

app = Flask(__name__)

@app.route("/chat", methods=["POST"])
def chat():
    """
    POST JSON body should include:
    {
        "system_prompt": "generic system prompt",
        "bias": "optional bias string",
        "message_array": [{"role": "user", "content": "Hi"}],
        "question": "User's new question"
    }
    """
    try:
        data = request.get_json()

        system_prompt = data.get("system_prompt", "")
        bias = data.get("bias", "")
        message_array = data.get("message_array", [])
        question = data.get("question", "")

        # Validate required fields
        if not system_prompt or not question:
            return jsonify({"error": "system_prompt and question are required"}), 400

        # Call the AI using imported function
        ai_reply, updated_messages = send_ai_message(system_prompt, bias, message_array, question)

        return jsonify({
            "ai_reply": ai_reply,
            "updated_messages": updated_messages
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)