from flask import Flask, request, jsonify,  send_from_directory
from flask_cors import CORS
import cv2
import numpy as np
import os
import requests

app = Flask(__name__)
CORS(app)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FACES_DIR = os.path.join(BASE_DIR, 'faces')

NESTJS_API_URL = 'http://localhost:3000/faces/register'

os.makedirs(FACES_DIR, exist_ok=True)

# Initialize face recognizer and cascade
recognizer = cv2.face.LBPHFaceRecognizer_create()
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
known_faces = {}

# Train recognizer from known faces
def train_recognizer():
    if not known_faces:
        print("No known faces to train.")
        return
    faces, labels = zip(*[(face, uid) for uid, face in known_faces.items()])
    recognizer.train(faces, np.array(labels))
    print("Recognizer trained.")
    
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

        # Save the image
        filename = os.path.join(FACES_DIR, f"{user_id}.jpg")
        with open(filename, 'wb') as f:
            f.write(image_bytes)

        return jsonify({"success": True, "user_id": user_id})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
def load_faces_from_disk():
    global known_faces
    known_faces.clear()

    for filename in os.listdir(FACES_DIR):
        if filename.endswith('.jpg'):
            user_id = int(os.path.splitext(filename)[0])
            filepath = os.path.join(FACES_DIR, filename)
            image = cv2.imread(filepath)
            
            # Convert to grayscale (LBPH requires grayscale images)
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

            # Detect face(s) using OpenCV's Haar Cascade
            faces = face_cascade.detectMultiScale(gray, 1.1, 4)
            if faces is not None:
                for (x, y, w, h) in faces:
                    face_region = gray[y:y+h, x:x+w]
                    known_faces[user_id] = face_region  # Add face region to known faces

    train_recognizer()

@app.route('/recognize', methods=['POST'])
def recognize():
    if 'image' not in request.files:
        return jsonify({"error": "No image"}), 400

    try:
        # Decode image
        image = cv2.imdecode(np.frombuffer(request.files['image'].read(), np.uint8), cv2.IMREAD_COLOR)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Detect faces in the image
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)

        if len(faces) == 0:
            return jsonify({"error": "No face detected"}), 400

        results = []
        for (x, y, w, h) in faces:
            face_region = gray[y:y+h, x:x+w]

            # Recognize face using LBPH recognizer
            label, confidence = recognizer.predict(face_region)

            if confidence < 100:  # Adjust this threshold to fine-tune the recognition accuracy
                results.append({"userId": label, "confidence": confidence})

        if not results:
            return jsonify({"error": "No match found"}), 400

        # If we have multiple matches, prioritize the one with the lowest confidence
        best_match = min(results, key=lambda x: x['confidence'])

        # Confidence threshold to determine if it's a good match
        if best_match['confidence'] < 50:  # Adjust threshold as needed
            return jsonify({
                "success": True,
                "userId": best_match["userId"],
                "confidence": best_match["confidence"]
            })
        else:
            return jsonify({"error": "No confident match"}), 400

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/reload-faces', methods=['GET'])
def reload_faces():
    load_faces_from_disk()
    return jsonify({"message": f"Faces reloaded: {len(known_faces)}"}), 200

# Route to serve the faces images
@app.route('/faces/<filename>')
def serve_face_image(filename):
    # Point to your 'faces' folder and serve the image
    faces_folder = 'C:/Users/HP/OneDrive - Ministere de l\'Enseignement Superieur et de la Recherche Scientifique/Desktop/sec_proj/Presencia/FaceRecognition/faces'
    return send_from_directory(faces_folder, filename)

if __name__ == '__main__':
    load_faces_from_disk()
    app.run(host='0.0.0.0', port=5000)