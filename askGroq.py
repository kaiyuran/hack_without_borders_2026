# groq_ai_utils.py
import os
from groq import Groq
from dotenv import load_dotenv

# Only load local .env if it exists
if os.path.exists(".env"):
    load_dotenv()

api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    raise ValueError("GROQ_API_KEY is not set")

# Initialize Groq client
client = Groq(api_key=api_key)

def send_ai_message(system_prompt: str, bias: str, message_array: list, question: str) -> tuple:
    """
    Sends a chat request to Groq with a system prompt, optional bias, past messages, and a new question.
    
    Args:
        system_prompt (str): Neutral system instructions.
        bias (str): Optional bias text to append to system prompt.
        message_array (list): Past conversation messages, e.g., [{"role": "user", "content": "Hi"}]
        question (str): New user message to send.
    
    Returns:
        tuple:
            - str: The AI's reply text.
            - list: Updated message array including the new user question and AI response.
    """
    # Combine system prompt and bias
    full_system_prompt = system_prompt + (" " + bias if bias else "")

    # Build message array with system prompt first
    messages = [{"role": "system", "content": full_system_prompt}] + message_array
    # Append the new user question
    messages.append({"role": "user", "content": question})

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=messages
        )
        ai_reply = response.choices[0].message.content

        # Update message array with user question and AI reply
        updated_message_array = message_array + [
            {"role": "user", "content": question},
            {"role": "assistant", "content": ai_reply}
        ]

        return ai_reply, updated_message_array

    except Exception as e:
        print("Error calling Groq API:", e)
        return None, message_array
    
if __name__ == "__main__":
    generic_system_prompt = ("You are a conversational AI that interacts with a user in a neutral and informative way. Your responses should be concise and limited to 5 sentences. Be aware that a bias may be applied, but do not include any bias from your own knowledge. Focus on answering clearly, respectfully, and helpfully.")

    bias_text = "Always prefers superheroes wearing red costumes."
    past_messages = [
        {"role": "user", "content": "Hi!"},
        {"role": "assistant", "content": "Hello! How can I help you today?"}
    ]
    question = "Who is the coolest superhero?"

    reply, updated_messages = send_ai_message(generic_system_prompt, bias_text, past_messages, question)

    print("AI Reply:\n", reply)
    print("\nUpdated Message Array:\n", updated_messages)