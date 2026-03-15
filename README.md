# VerifAI

VerifAI is an educational game designed for kids to learn about the biases that can be present in the AI LLMs that we use on a daily basis. 

play the game at https://kaiyuran.github.io/hack_without_borders_2026/

## Installation

To install the project locally, go to https://groq.com/ and sign up to get a free api key. Put the api key in a file called keys.env in the format
```
GROQ_API_KEY=[API_KEY]
```

Create a Virtual Environment (venv) and install package files
```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

## Usage
While in the venv, run
```
python server.py
```

Next, edit the docs\app.js apiBaseUrl with the adress of the Flask server
Then, open up the docs\index.html file in your favourite browser and try the game!

## License

[MIT](https://choosealicense.com/licenses/mit/)