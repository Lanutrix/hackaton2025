"""
WebSocket endpoint for real-time EAN-13 barcode scanning from video stream.
"""
import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from src.utils.barcode.barcode_scanner import get_scanner

router = APIRouter(tags=["barcode-ws"])


@router.websocket("/ws/scan")
async def websocket_barcode_scan(websocket: WebSocket):
    """
    WebSocket endpoint for barcode scanning.
    
    Client sends:
    - Binary frames (JPEG/PNG encoded images) OR
    - JSON with base64 encoded image: {"image": "base64_data"}
    
    Server responds when EAN-13 barcode is detected:
    {
        "code": "1234567890123",
        "img": "base64_encoded_jpeg"
    }
    """
    await websocket.accept()
    scanner = get_scanner()
    
    # Keep track of last detected code to avoid duplicates
    last_detected_code = None
    # Cooldown counter to allow re-detection after some frames
    cooldown_frames = 0
    COOLDOWN_THRESHOLD = 30  # Allow re-detection after 30 frames
    
    try:
        while True:
            try:
                # Try to receive binary data first (more efficient)
                data = await websocket.receive()
                
                frame = None
                
                if "bytes" in data and data["bytes"]:
                    # Binary frame data
                    frame = scanner.decode_bytes_frame(data["bytes"])
                elif "text" in data and data["text"]:
                    # JSON with base64 image
                    try:
                        json_data = json.loads(data["text"])
                        if "image" in json_data:
                            frame = scanner.decode_base64_frame(json_data["image"])
                    except json.JSONDecodeError:
                        # Maybe it's just raw base64
                        frame = scanner.decode_base64_frame(data["text"])
                
                if frame is None:
                    continue
                
                # Update cooldown
                if cooldown_frames > 0:
                    cooldown_frames -= 1
                    if cooldown_frames == 0:
                        last_detected_code = None
                
                # Scan for barcode
                result = scanner.scan_frame(frame)
                
                if result:
                    code, detected_frame = result
                    
                    # Check if it's a new code or cooldown expired
                    if code != last_detected_code:
                        # Encode frame to base64
                        img_base64 = scanner.frame_to_base64(detected_frame)
                        
                        # Send result to client
                        response = {
                            "code": code,
                            "img": img_base64
                        }
                        await websocket.send_json(response)
                        
                        # Update last detected code and reset cooldown
                        last_detected_code = code
                        cooldown_frames = COOLDOWN_THRESHOLD
                        
            except WebSocketDisconnect:
                break
            except Exception as e:
                # Log error but continue processing
                print(f"Error processing frame: {e}")
                continue
                
    except WebSocketDisconnect:
        pass
    finally:
        print("WebSocket connection closed")


@router.websocket("/ws/scan/continuous")
async def websocket_barcode_scan_continuous(websocket: WebSocket):
    """
    WebSocket endpoint for continuous barcode scanning.
    Unlike /ws/scan, this will send every detected barcode,
    even if it's the same code in consecutive frames.
    
    Client sends:
    - Binary frames (JPEG/PNG encoded images) OR
    - JSON with base64 encoded image: {"image": "base64_data"}
    
    Server responds when EAN-13 barcode is detected:
    {
        "code": "1234567890123",
        "img": "base64_encoded_jpeg"
    }
    """
    await websocket.accept()
    scanner = get_scanner()
    
    try:
        while True:
            try:
                data = await websocket.receive()
                
                frame = None
                
                if "bytes" in data and data["bytes"]:
                    frame = scanner.decode_bytes_frame(data["bytes"])
                elif "text" in data and data["text"]:
                    try:
                        json_data = json.loads(data["text"])
                        if "image" in json_data:
                            frame = scanner.decode_base64_frame(json_data["image"])
                    except json.JSONDecodeError:
                        frame = scanner.decode_base64_frame(data["text"])
                
                if frame is None:
                    continue
                
                result = scanner.scan_frame(frame)
                
                if result:
                    code, detected_frame = result
                    img_base64 = scanner.frame_to_base64(detected_frame)
                    
                    response = {
                        "code": code,
                        "img": img_base64
                    }
                    await websocket.send_json(response)
                        
            except WebSocketDisconnect:
                break
            except Exception as e:
                print(f"Error processing frame: {e}")
                continue
                
    except WebSocketDisconnect:
        pass
    finally:
        print("WebSocket connection closed")

