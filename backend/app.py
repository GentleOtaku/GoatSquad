from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import cv2
from analysis import process_uploaded_video
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/upload', methods=['POST'])
def upload_video():
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400
    
    video_file = request.files['video']
    if video_file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    result = process_uploaded_video(video_file)
    
    if result['success']:
        return jsonify({'message': 'Video processed successfully'}), 200
    else:
        return jsonify({'error': result['message']}), 500

@app.route('/analyze', methods=['POST'])
def analyze_video():
    # Check if processed video exists
    output_path = os.path.join("output", "inverted_video.mp4")
    if os.path.exists(output_path):
        return send_file(output_path, mimetype='video/mp4')
    else:
        return jsonify({'error': 'No processed video found'}), 404

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')