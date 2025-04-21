# === BACKEND: CSV loader for candidate answers ===
import pandas as pd
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.neural_network import MLPClassifier
import os

app = Flask(__name__)
CORS(app)

clf = None
candidates = []


# === Load candidates from CSV ===
def load_candidates_from_csv():
    global candidates, clf

    base_path = os.path.dirname(__file__)
    csv_path = os.path.join(base_path, "candidates.csv")
    df = pd.read_csv(csv_path)
    candidates = df["name"].tolist()
    X = df.drop(columns=["name"]).to_numpy()
    y = np.arange(len(candidates))
    clf = MLPClassifier(hidden_layer_sizes=(50,), max_iter=500, random_state=42)
    clf.fit(X, y)


# === API ===
@app.route("/predict", methods=["POST"])
def predict():
    if clf is None:
        return jsonify({"error": "Model not trained"}), 500
    data = request.json
    answers = np.array(data["answers"]).reshape(1, -1)
    index = clf.predict(answers)[0]
    return jsonify({"candidate": candidates[index]})


if __name__ == "__main__":
    load_candidates_from_csv()  # load on startup
    app.run(debug=True)
