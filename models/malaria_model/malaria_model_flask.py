from flask import Flask, request, jsonify
from flask_cors import CORS
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
# CONFIGURATION
# ============================================================================

import os

# Use relative path to the model file
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'best_malaria_model_finetuned.pt')
IMG_SIZE = 224
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

CLASS_NAMES = ['Parasitized', 'Uninfected']

print("="*80)
print("MALARIA DETECTION API - FLASK SERVER")
print("="*80)
print(f"Device: {DEVICE}")
print(f"Model Path: {MODEL_PATH}")

# ============================================================================
# LOAD MODEL
# ============================================================================

def load_model():
    """Load the fine-tuned EfficientNet-B0 model"""
    print("\nLoading model...")
    
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
    checkpoint = torch.load(MODEL_PATH, map_location=DEVICE)
    model.load_state_dict(checkpoint['model_state_dict'])
    model = model.to(DEVICE)
    model.eval()
    
    print(f"✓ Model loaded successfully!")
    print(f"✓ Model validation accuracy: {checkpoint['val_acc']:.4f}")
    
    return model

# Load model at startup
model = load_model()

# ============================================================================
# IMAGE PREPROCESSING
# ============================================================================

def preprocess_image(image):
    """Preprocess image for model input"""
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

# ============================================================================
# PREDICTION FUNCTION
# ============================================================================

def predict_malaria(image):
    """Run inference on the image"""
    # Preprocess
    input_tensor = preprocess_image(image)
    
    # Predict
    with torch.no_grad():
        output = model(input_tensor)
        probability = output.item()
    
    # Get prediction (threshold at 0.5)
    predicted_class = 1 if probability > 0.5 else 0
    class_name = CLASS_NAMES[predicted_class]
    
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
# API ENDPOINTS
# ============================================================================

@app.route('/')
def home():
    """Home endpoint"""
    return jsonify({
        'message': 'Malaria Detection API',
        'version': '1.0',
        'endpoints': {
            '/analyse-malaria': 'POST - Upload cell image for malaria detection',
            '/health': 'GET - Check API health status'
        }
    })

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'device': str(DEVICE)
    })

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
        # Check if image is provided as file upload (accept both 'file' and 'image' field names)
        if 'file' in request.files or 'image' in request.files:
            file = request.files.get('file') or request.files.get('image')
            
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
        
        # Check if image is provided as base64 in JSON
        elif request.is_json and 'image' in request.json:
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
        
        else:
            return jsonify({
                'success': False,
                'error': 'No image provided. Use "file" in form-data or "image" in JSON'
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
    Batch analysis for multiple images
    
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
                'infection_rate': round((parasitized_count / len(files)) * 100, 2)
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
    print("Starting Flask server...")
    print("API will be available at: http://localhost:5002")
    print("="*80 + "\n")
    
    app.run(host='0.0.0.0', port=5002, debug=True)
