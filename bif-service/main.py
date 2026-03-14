from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from nsfw_detector import predict
import os

app = FastAPI()

# Load the model once at startup so it's ready to fire instantly
# Assumes your model is at /app/model.h5 - adjust path if needed
MODEL_PATH = '/app/nsfw_mobilenet2/saved_model.h5'
model = predict.load_model(MODEL_PATH)

class ScanRequest(BaseModel):
    file_path: str

@app.post("/scan")
async def scan(request: ScanRequest):
    if not os.path.exists(request.file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    results = predict.classify(model, request.file_path)
    # results format: { 'path': {'porn': 0.98, 'neutral': 0.02...} }
    scores = list(results.values())[0]
    
    return {"status": "success", "scores": scores}
