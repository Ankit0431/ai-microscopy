import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from ultralytics import YOLO
from collections import Counter
import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
import io
import base64
import numpy as np

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# ============================================================================
# BCCD MODEL CONFIGURATION
# ============================================================================

BCCD_MODEL_PATH = r'bccd_model/best_bccd.pt'

BCCD_CLASS_NAMES = {
    0: 'Platelets',
    1: 'RBC',
    2: 'WBC'
}

# ============================================================================
# MALARIA MODEL CONFIGURATION
# ============================================================================

MALARIA_MODEL_PATH = r'malaria_model/best_malaria_model_finetuned.pt'
IMG_SIZE = 224
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

MALARIA_CLASS_NAMES = ['Parasitized', 'Uninfected']

# ============================================================================
# UPLOAD CONFIGURATION
# ============================================================================

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

# Create upload folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# ============================================================================
# LOAD MODELS
# ============================================================================

print("="*80)
print("COMBINED MEDICAL IMAGE ANALYSIS API - FLASK SERVER")
print("="*80)
print(f"Device: {DEVICE}")

# Load BCCD Model
print("\nLoading BCCD model...")
bccd_model = YOLO(BCCD_MODEL_PATH)
print("✓ BCCD model loaded successfully!")

# Load Malaria Model
print("\nLoading Malaria model...")
def load_malaria_model():
    """Load the fine-tuned EfficientNet-B0 model"""
    # Create model architecture
    model = models.efficientnet_b0(weights=None)
    
    # Recreate classifier
    num_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(num_features, 128),
        nn.ReLU(),
        nn.BatchNorm1d(128),
        nn.Dropout(0.3),
        nn.Linear(128, 1),
        nn.Sigmoid()
    )
    
    # Load weights
    checkpoint = torch.load(MALARIA_MODEL_PATH, map_location=DEVICE)
    model.load_state_dict(checkpoint['model_state_dict'])
    model = model.to(DEVICE)
    model.eval()
    
    print(f"✓ Malaria model loaded successfully!")
    print(f"✓ Model validation accuracy: {checkpoint['val_acc']:.4f}")
    
    return model

malaria_model = load_malaria_model()

print("\n" + "="*80)
print("All models loaded successfully!")
print("="*80 + "\n")

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def allowed_file(filename):
    """Check if the file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- BCCD Helper Functions ---

def get_bccd_prediction_counts(image_path):
    """
    Runs the YOLO model on a single image and returns counts for each class.
    Returns a dictionary with class names as keys and counts as values.
    """
    # Run inference
    results = bccd_model(image_path, verbose=False)
    
    # Count predictions by class
    pred_counts = Counter()
    if results:
        class_ids = results[0].boxes.cls.cpu().numpy().astype(int)
        for cls_id in class_ids:
            pred_counts[cls_id] += 1
    
    # Convert to dictionary with class names
    counts_dict = {
        BCCD_CLASS_NAMES[cls_id]: int(pred_counts.get(cls_id, 0))
        for cls_id in BCCD_CLASS_NAMES.keys()
    }
    
    return counts_dict

# --- Malaria Helper Functions ---

def preprocess_image(image):
    """Preprocess image for malaria model input"""
    transform = transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    
    # Convert to RGB if needed
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Apply transforms
    image_tensor = transform(image).unsqueeze(0)  # Add batch dimension
    return image_tensor.to(DEVICE)

def predict_malaria(image):
    """Run inference on the image for malaria detection"""
    # Preprocess
    input_tensor = preprocess_image(image)
    
    # Predict
    with torch.no_grad():
        output = malaria_model(input_tensor)
        probability = output.item()
    
    # Get prediction (threshold at 0.5)
    predicted_class = 1 if probability > 0.5 else 0
    class_name = MALARIA_CLASS_NAMES[predicted_class]
    
    # Calculate confidence
    confidence = probability if predicted_class == 1 else (1 - probability)
    
    return {
        'prediction': class_name,
        'confidence': float(confidence),
        'probabilities': {
            'Parasitized': float(1 - probability),
            'Uninfected': float(probability)
        },
        'is_infected': predicted_class == 0  # Parasitized is class 0
    }

# ============================================================================
# GENERAL API ENDPOINTS
# ============================================================================

@app.route('/')
def home():
    """Home endpoint"""
    return jsonify({
        'message': 'Combined Medical Image Analysis API',
        'version': '1.0',
        'models': ['BCCD Blood Cell Counter', 'Malaria Detection'],
        'endpoints': {
            '/analyse-bccd': 'POST - Analyze blood cell image for cell counting',
            '/analyse-malaria': 'POST - Analyze cell image for malaria detection',
            '/batch-analyse': 'POST - Batch analysis for multiple malaria images',
            '/health': 'GET - Check API health status'
        }
    })

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'bccd_model_loaded': bccd_model is not None,
        'malaria_model_loaded': malaria_model is not None,
        'device': str(DEVICE),
        'bccd_model_path': BCCD_MODEL_PATH,
        'malaria_model_path': MALARIA_MODEL_PATH
    }), 200

# ============================================================================
# BCCD ENDPOINTS
# ============================================================================

@app.route('/analyse-bccd', methods=['POST'])
def analyse_bccd():
    """
    Endpoint to analyze blood cell images for cell counting.
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
        counts = get_bccd_prediction_counts(filepath)
        
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

# ============================================================================
# MALARIA ENDPOINTS
# ============================================================================

@app.route('/analyse-malaria', methods=['POST'])
def analyse_malaria():
    """
    Analyse malaria cell image
    
    Request:
        - file: Image file (multipart/form-data)
        OR
        - image: Base64 encoded image string (JSON)
    
    Response:
        {
            "success": true,
            "prediction": "Parasitized" or "Uninfected",
            "confidence": 0.95,
            "probabilities": {
                "Parasitized": 0.05,
                "Uninfected": 0.95
            },
            "is_infected": false,
            "message": "Analysis completed successfully"
        }
    """
    try:
        # Check if image is provided
        if 'image' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No image provided. Use "image" in form-data or "image" in JSON'
            }), 400
        
        # Load image from file upload
        if 'image' in request.files:
            file = request.files['image']
            
            if file.filename == '':
                return jsonify({
                    'success': False,
                    'error': 'No file selected'
                }), 400
            
            # Check file extension
            allowed_extensions = {'png', 'jpg', 'jpeg'}
            if not ('.' in file.filename and 
                    file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
                return jsonify({
                    'success': False,
                    'error': 'Invalid file type. Allowed: PNG, JPG, JPEG'
                }), 400
            
            # Read image
            image_bytes = file.read()
            image = Image.open(io.BytesIO(image_bytes))
        
        # Load image from base64
        elif 'image' in request.json:
            try:
                image_base64 = request.json['image']
                # Remove data URL prefix if present
                if ',' in image_base64:
                    image_base64 = image_base64.split(',')[1]
                image_bytes = base64.b64decode(image_base64)
                image = Image.open(io.BytesIO(image_bytes))
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': f'Invalid base64 image: {str(e)}'
                }), 400
        
        # Get image info
        image_info = {
            'width': image.size[0],
            'height': image.size[1],
            'mode': image.mode
        }
        
        # Run prediction
        result = predict_malaria(image)
        
        # Return response
        return jsonify({
            'success': True,
            'prediction': result['prediction'],
            'confidence': round(result['confidence'] * 100, 2),  # Convert to percentage
            'probabilities': {
                'Parasitized': round(result['probabilities']['Parasitized'] * 100, 2),
                'Uninfected': round(result['probabilities']['Uninfected'] * 100, 2)
            },
            'is_infected': result['is_infected'],
            'image_info': image_info,
            'message': 'Analysis completed successfully'
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error processing image: {str(e)}'
        }), 500

@app.route('/batch-analyse', methods=['POST'])
def batch_analyse():
    """
    Batch analysis for multiple malaria images
    
    Request:
        - files: Multiple image files (multipart/form-data)
    
    Response:
        {
            "success": true,
            "results": [
                { "filename": "image1.png", "prediction": "...", ... },
                ...
            ],
            "summary": {
                "total": 10,
                "parasitized": 3,
                "uninfected": 7
            }
        }
    """
    try:
        if 'files' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No files provided'
            }), 400
        
        files = request.files.getlist('files')
        
        if len(files) == 0:
            return jsonify({
                'success': False,
                'error': 'No files selected'
            }), 400
        
        results = []
        parasitized_count = 0
        uninfected_count = 0
        
        for file in files:
            try:
                # Read image
                image_bytes = file.read()
                image = Image.open(io.BytesIO(image_bytes))
                
                # Predict
                result = predict_malaria(image)
                
                # Count
                if result['is_infected']:
                    parasitized_count += 1
                else:
                    uninfected_count += 1
                
                results.append({
                    'filename': file.filename,
                    'prediction': result['prediction'],
                    'confidence': round(result['confidence'] * 100, 2),
                    'is_infected': result['is_infected']
                })
            
            except Exception as e:
                results.append({
                    'filename': file.filename,
                    'error': str(e)
                })
        
        return jsonify({
            'success': True,
            'results': results,
            'summary': {
                'total': len(files),
                'parasitized': parasitized_count,
                'uninfected': uninfected_count,
                'infection_rate': round((parasitized_count / len(files)) * 100, 2) if len(files) > 0 else 0
            },
            'message': f'Batch analysis completed for {len(files)} images'
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error in batch processing: {str(e)}'
        }), 500

# ============================================================================
# RUN SERVER
# ============================================================================

if __name__ == '__main__':
    print("\n" + "="*80)
    print("Starting Combined Flask server...")
    print("API will be available at: http://localhost:5000")
    print("="*80 + "\n")
    
    app.run(host='0.0.0.0', port=5000, debug=True)
