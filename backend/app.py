from flask import Flask, request, send_file
from flask_restx import Api, Resource, fields
from flask_cors import CORS
import cv2
from analysis import process_uploaded_video
import os
import werkzeug

app = Flask(__name__)
# Enable CORS with specific settings
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Create API instance
api = Api(app, version='1.0', 
    title='Video Processing API',
    description='API for uploading and processing videos',
    doc='/swagger'
)

# Create namespaces for different endpoints
video_ns = api.namespace('video', description='Video processing operations')

# Define nested models for video statistics
video_stats = api.model('VideoStats', {
    'frame_count': fields.Integer(description='Total number of frames'),
    'fps': fields.Float(description='Frames per second'),
    'width': fields.Integer(description='Video width'),
    'height': fields.Integer(description='Video height'),
    'duration': fields.Float(description='Video duration in seconds'),
    'file_size': fields.Integer(description='File size in bytes')
})

# Define models for swagger documentation
upload_response = api.model('UploadResponse', {
    'message': fields.String(description='Response message'),
    'error': fields.String(description='Error message if any'),
    'processed_stats': fields.Nested(video_stats, description='Processed video statistics')
})

# File upload parser
upload_parser = api.parser()
upload_parser.add_argument('video', 
    type=werkzeug.datastructures.FileStorage, 
    location='files', 
    required=True, 
    help='Video file to process')

@video_ns.route('/upload')
class VideoUpload(Resource):
    @video_ns.expect(upload_parser)
    @video_ns.response(200, 'Success', upload_response)
    @video_ns.response(400, 'Validation Error', upload_response)
    @video_ns.response(500, 'Processing Error', upload_response)
    def post(self):
        """Upload and process a video file"""
        if 'video' not in request.files:
            return {'error': 'No video file provided'}, 400
        
        video_file = request.files['video']
        if video_file.filename == '':
            return {'error': 'No selected file'}, 400

        result = process_uploaded_video(video_file)
        
        if result['success']:
            return {
                'message': 'Video processed successfully',
                'processed_stats': result['processed_stats']
            }, 200
        else:
            return {'error': result['message']}, 500

@video_ns.route('/analyze')
class VideoAnalysis(Resource):
    @video_ns.response(200, 'Returns the processed video file')
    @video_ns.response(404, 'Video not found', upload_response)
    def post(self):
        """Retrieve the processed video"""
        output_path = os.path.join("output", "inverted_video.mp4")
        if os.path.exists(output_path):
            return send_file(output_path, mimetype='video/mp4')
        else:
            return {'error': 'No processed video found'}, 404

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')