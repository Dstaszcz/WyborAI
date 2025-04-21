from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import pandas as pd
import numpy as np
import os
from sklearn.neural_network import MLPClassifier

app = Flask(__name__)
CORS(app)

limiter = Limiter(get_remote_address, app=app, default_limits=["5 per minute"])

base_path = os.path.dirname(__file__)
csv_path = os.path.join(base_path, "candidates.csv")
df = pd.read_csv(csv_path)
candidate_names = df["name"].tolist()
X = df.drop(columns=["name"]).values
y = np.arange(len(candidate_names))

model = MLPClassifier(hidden_layer_sizes=(50,), max_iter=500, random_state=42)
model.fit(X, y)


@app.route("/predict", methods=["POST"])
@limiter.limit("5 per minute")
def predict():
    data = request.get_json()
    answers = data.get("answers", [])

    if len(answers) != 30:
        return jsonify({"error": "Niepoprawna liczba odpowiedzi – wymagane 30."}), 400

    input_vector = np.array(answers).reshape(1, -1)
    prediction = model.predict(input_vector)[0]
    probabilities = model.predict_proba(input_vector)[0]
    match_percent = round(np.max(probabilities) * 100)

    return jsonify({
        "candidate": candidate_names[prediction],
        "match_percent": match_percent
    })


if __name__ == "__main__":
    app.run(debug=True)
