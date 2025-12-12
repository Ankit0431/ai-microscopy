import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from ultralytics import YOLO
from collections import Counter
import numpy as np

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# --- Configuration -----------------------------------------------------------

# Path to your best model weights
MODEL_PATH = 'best_bccd.pt'

# Class names (must match your YAML)
CLASS_NAMES = {
    0: 'Platelets',
    1: 'RBC',
    2: 'WBC'
}

# Upload configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

# Create upload folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Load the model once at startup
print("Loading YOLO model...")
model = YOLO(MODEL_PATH)
print("Model loaded successfully!")

# --- Helper Functions --------------------------------------------------------

def allowed_file(filename):
    """Check if the file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_prediction_counts(image_path):
    """
    Runs the YOLO model on a single image and returns counts for each class.
    Returns a dictionary with class names as keys and counts as values.
    """
    # Run inference
    results = model(image_path, verbose=False)
    
    # Count predictions by class
    pred_counts = Counter()
    if results:
        class_ids = results[0].boxes.cls.cpu().numpy().astype(int)
        for cls_id in class_ids:
            pred_counts[cls_id] += 1
    
    # Convert to dictionary with class names
    counts_dict = {
        CLASS_NAMES[cls_id]: int(pred_counts.get(cls_id, 0))
        for cls_id in CLASS_NAMES.keys()
    }
    
    return counts_dict

# --- API Endpoints -----------------------------------------------------------

@app.route('/analyse-bccd', methods=['POST'])
def analyse_bccd():
    """
    Endpoint to analyze blood cell images.
    Accepts an image file and returns cell counts in JSON format.
    """
    # Check if image file is in request
    if 'image' not in request.files:
        return jsonify({
            'error': 'No image file provided',
            'message': 'Please upload an image file with key "image"'
        }), 400
    
    file = request.files['image']
    
    # Check if filename is empty
    if file.filename == '':
        return jsonify({
            'error': 'No file selected',
            'message': 'Please select a file to upload'
        }), 400
    
    # Check if file type is allowed
    if not allowed_file(file.filename):
        return jsonify({
            'error': 'Invalid file type',
            'message': f'Allowed file types: {", ".join(ALLOWED_EXTENSIONS)}'
        }), 400
    
    filepath = None
    try:
        # Save the uploaded file
        filename = secure_filename(file.filename or 'image.jpg')
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Get predictions
        counts = get_prediction_counts(filepath)
        
        # Calculate total
        total_cells = sum(counts.values())
        
        # Clean up - remove uploaded file
        os.remove(filepath)
        
        # Return results in JSON format
        return jsonify({
            'success': True,
            'filename': filename,
            'counts': counts,
            'total_cells': total_cells,
            'metrics': {
                'Platelets': counts['Platelets'],
                'RBC': counts['RBC'],
                'WBC': counts['WBC']
            }
        }), 200
        
    except Exception as e:
        # Clean up file if it exists
        if filepath and os.path.exists(filepath):
            os.remove(filepath)
        
        return jsonify({
            'error': 'Processing failed',
            'message': str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': True,
        'model_path': MODEL_PATH
    }), 200

@app.route('/', methods=['GET'])
def index():
    """Root endpoint with API information"""
    return jsonify({
        'message': 'BCCD Blood Cell Analysis API',
        'version': '1.0',
        'endpoints': {
            '/analyse-bccd': {
                'method': 'POST',
                'description': 'Analyze blood cell image',
                'parameters': {
                    'image': 'Image file (jpg, jpeg, png)'
                },
                'returns': 'Cell counts in JSON format'
            },
            '/health': {
                'method': 'GET',
                'description': 'Check API health status'
            }
        },
        'classes': list(CLASS_NAMES.values())
    }), 200

# --- Run the Application -----------------------------------------------------

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
