from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import os

app = Flask(__name__)
CORS(app)

# Initialize face recognizer and cascade
recognizer = cv2.face.LBPHFaceRecognizer_create()
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

known_faces = {}  # {user_id: face_data}

# Train recognizer on known faces
def train_recognizer():
    if not known_faces:
        return
    faces = []
    labels = []
    for user_id, face_data in known_faces.items():
        faces.append(face_data)
        labels.append(user_id)
    recognizer.train(faces, np.array(labels))

@app.route('/register', methods=['POST'])
def register():
    if 'image' not in request.files or not request.form.get('user_id'):
        return jsonify({"error": "Image and user_id required"}), 400

    try:
        user_id = int(request.form['user_id'])
        image_file = request.files['image']

        image_bytes = image_file.read()
        image_array = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        faces = face_cascade.detectMultiScale(gray, 1.3, 5)
        if len(faces) == 0:
            return jsonify({"error": "No faces detected"}), 400

        # Take only the first detected face for registration
        x, y, w, h = faces[0]
        face_roi = gray[y:y+h, x:x+w]

        known_faces[user_id] = face_roi
        train_recognizer()

        return jsonify({"success": True, "user_id": user_id})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/recognize', methods=['POST'])
def recognize():
    if 'image' not in request.files:
        print("No image received")
        return jsonify({'error': 'No image file provided'}), 400
    
    try:
        image_file = request.files['image']
        image_bytes = image_file.read()
        image_array = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        faces = face_cascade.detectMultiScale(gray, 1.3, 5)
        if len(faces) == 0:
            return jsonify({"error": "No faces detected"}), 400

        results = []
        for (x, y, w, h) in faces:
            face_roi = gray[y:y+h, x:x+w]
            try:
                label, confidence = recognizer.predict(face_roi)
                if label in known_faces:
                    results.append({
                        "userId": int(label),
                        "confidence": float(confidence)
                    })
            except:
                continue  # Skip unrecognizable faces

        if not results:
            return jsonify({"error": "No recognizable faces"}), 400

        best_match = min(results, key=lambda x: x['confidence'])
        if best_match['confidence'] < 70:  # confidence threshold (lower is better)
            return jsonify({
                "success": True,
                "userId": best_match["userId"],
                "confidence": best_match["confidence"]
            })
        else:
            return jsonify({"error": "No face matched confidently"}), 400

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)