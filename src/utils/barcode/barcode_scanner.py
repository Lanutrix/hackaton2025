"""
EAN-13 Barcode Scanner with high accuracy detection.
Uses pyzbar + OpenCV with multiple preprocessing techniques for best results.
"""
import cv2
import numpy as np
from pyzbar import pyzbar
from pyzbar.pyzbar import ZBarSymbol
from typing import Optional, Tuple
import base64


class BarcodeScanner:
    """
    High-accuracy EAN-13 barcode scanner.
    Uses multiple preprocessing techniques and multi-scale detection.
    """
    
    def __init__(self):
        # Scales to try for multi-scale detection
        self.scales = [1.0, 1.5, 2.0, 0.75, 0.5]
        # Rotation angles to try (degrees)
        self.angles = [0, 90, 180, 270]
        
    def _preprocess_grayscale(self, img: np.ndarray) -> np.ndarray:
        """Convert to grayscale if needed."""
        if len(img.shape) == 3:
            return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        return img
    
    def _preprocess_sharpen(self, img: np.ndarray) -> np.ndarray:
        """Sharpen the image for better edge detection."""
        kernel = np.array([[-1, -1, -1],
                          [-1,  9, -1],
                          [-1, -1, -1]])
        return cv2.filter2D(img, -1, kernel)
    
    def _preprocess_clahe(self, img: np.ndarray) -> np.ndarray:
        """Apply CLAHE for better contrast."""
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        return clahe.apply(img)
    
    def _preprocess_threshold(self, img: np.ndarray) -> np.ndarray:
        """Apply adaptive threshold for binary image."""
        return cv2.adaptiveThreshold(
            img, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 11, 2
        )
    
    def _preprocess_otsu(self, img: np.ndarray) -> np.ndarray:
        """Apply Otsu's threshold."""
        _, binary = cv2.threshold(img, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return binary
    
    def _preprocess_morphology(self, img: np.ndarray) -> np.ndarray:
        """Apply morphological operations to clean up the image."""
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        img = cv2.morphologyEx(img, cv2.MORPH_CLOSE, kernel)
        return img
    
    def _preprocess_denoise(self, img: np.ndarray) -> np.ndarray:
        """Apply denoising."""
        return cv2.fastNlMeansDenoising(img, None, 10, 7, 21)
    
    def _resize_image(self, img: np.ndarray, scale: float) -> np.ndarray:
        """Resize image by scale factor."""
        if scale == 1.0:
            return img
        h, w = img.shape[:2]
        new_w, new_h = int(w * scale), int(h * scale)
        return cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
    
    def _rotate_image(self, img: np.ndarray, angle: int) -> np.ndarray:
        """Rotate image by angle (0, 90, 180, 270)."""
        if angle == 0:
            return img
        elif angle == 90:
            return cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
        elif angle == 180:
            return cv2.rotate(img, cv2.ROTATE_180)
        elif angle == 270:
            return cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE)
        return img

    def _decode_barcodes(self, img: np.ndarray) -> list:
        """Decode EAN-13 barcodes from image."""
        # Decode only EAN-13 barcodes for better accuracy
        barcodes = pyzbar.decode(img, symbols=[ZBarSymbol.EAN13])
        return barcodes
    
    def _validate_ean13(self, code: str) -> bool:
        """Validate EAN-13 checksum."""
        if len(code) != 13 or not code.isdigit():
            return False
        
        # Calculate checksum
        odd_sum = sum(int(code[i]) for i in range(0, 12, 2))
        even_sum = sum(int(code[i]) for i in range(1, 12, 2))
        checksum = (10 - (odd_sum + even_sum * 3) % 10) % 10
        
        return checksum == int(code[12])
    
    def scan_frame(self, frame: np.ndarray) -> Optional[Tuple[str, np.ndarray]]:
        """
        Scan a single frame for EAN-13 barcodes.
        Returns tuple of (barcode_code, original_frame) if found, None otherwise.
        """
        original_frame = frame.copy()
        gray = self._preprocess_grayscale(frame)
        
        # Preprocessing pipelines to try
        preprocessing_pipelines = [
            # Pipeline 1: Original grayscale
            lambda img: img,
            # Pipeline 2: CLAHE
            lambda img: self._preprocess_clahe(img),
            # Pipeline 3: Sharpen
            lambda img: self._preprocess_sharpen(img),
            # Pipeline 4: CLAHE + Sharpen
            lambda img: self._preprocess_sharpen(self._preprocess_clahe(img)),
            # Pipeline 5: Adaptive threshold
            lambda img: self._preprocess_threshold(img),
            # Pipeline 6: Otsu threshold
            lambda img: self._preprocess_otsu(img),
            # Pipeline 7: CLAHE + Otsu
            lambda img: self._preprocess_otsu(self._preprocess_clahe(img)),
            # Pipeline 8: Denoise + CLAHE
            lambda img: self._preprocess_clahe(self._preprocess_denoise(img)),
            # Pipeline 9: Morphology cleanup
            lambda img: self._preprocess_morphology(self._preprocess_otsu(img)),
        ]
        
        # Try each scale
        for scale in self.scales:
            scaled_gray = self._resize_image(gray, scale)
            
            # Try each rotation
            for angle in self.angles:
                rotated = self._rotate_image(scaled_gray, angle)
                
                # Try each preprocessing pipeline
                for pipeline in preprocessing_pipelines:
                    try:
                        processed = pipeline(rotated)
                        barcodes = self._decode_barcodes(processed)
                        
                        for barcode in barcodes:
                            code = barcode.data.decode('utf-8')
                            if self._validate_ean13(code):
                                return (code, original_frame)
                    except Exception:
                        continue
        
        return None
    
    def frame_to_base64(self, frame: np.ndarray, quality: int = 85) -> str:
        """Convert frame to base64 encoded JPEG."""
        encode_params = [cv2.IMWRITE_JPEG_QUALITY, quality]
        _, buffer = cv2.imencode('.jpg', frame, encode_params)
        return base64.b64encode(buffer).decode('utf-8')
    
    def decode_base64_frame(self, base64_data: str) -> Optional[np.ndarray]:
        """Decode base64 encoded image to numpy array."""
        try:
            # Remove data URL prefix if present
            if ',' in base64_data:
                base64_data = base64_data.split(',')[1]
            
            img_data = base64.b64decode(base64_data)
            nparr = np.frombuffer(img_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            return frame
        except Exception:
            return None
    
    def decode_bytes_frame(self, data: bytes) -> Optional[np.ndarray]:
        """Decode binary image data to numpy array."""
        try:
            nparr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            return frame
        except Exception:
            return None


# Singleton instance
_scanner: Optional[BarcodeScanner] = None


def get_scanner() -> BarcodeScanner:
    """Get or create singleton scanner instance."""
    global _scanner
    if _scanner is None:
        _scanner = BarcodeScanner()
    return _scanner

