import cv2
import sys
import numpy as np

try:
    import mediapipe as mp
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision
except ImportError:
    print("MediaPipe is missing. Expected mediapipe tasks API.")
    sys.exit(1)

def draw_landmarks_on_image(rgb_image, detection_result):
    face_landmarks_list = detection_result.face_landmarks
    annotated_image = np.copy(rgb_image)

    # Convert RGB back to BGR to draw with OpenCV
    annotated_image = cv2.cvtColor(annotated_image, cv2.COLOR_RGB2BGR)

    mp_drawing = mp.solutions.drawing_utils if hasattr(mp, 'solutions') else None
    mp_drawing_styles = mp.solutions.drawing_styles if hasattr(mp, 'solutions') else None
    mp_face_mesh = mp.solutions.face_mesh if hasattr(mp, 'solutions') else None

    if len(face_landmarks_list) > 0:
        for face_landmarks in face_landmarks_list:
            # Manual drawing of dots if solutions API is completely missing
            h, w, _ = annotated_image.shape
            for idx, lm in enumerate(face_landmarks):
                x, y = int(lm.x * w), int(lm.y * h)
                # Draw a tiny dot for each landmark
                cv2.circle(annotated_image, (x, y), 1, (255, 255, 255), -1)
                
                # Highlight pupils (approximate indices for pupils if iris tracking is on)
                if idx in [468, 473]: # pupil centers
                    cv2.circle(annotated_image, (x, y), 3, (0, 0, 255), -1)

    return annotated_image

def run_face_demo():
    print("\n--- OralIQ AI Monitoring Demo (Face Mesh & Gaze Detection) ---")
    print("Logic: Tracks 468+ facial landmarks to monitor head pose and gaze.")
    print("Press 'q' in the camera window to quit.\n")

    model_path = 'face_model/face_landmarker.task'
    yolo_model_path = 'face_model/yolov8n.pt'
    import os
    if not os.path.exists(model_path):
        print(f"Error: Could not find model file at {model_path}")
        print("Please ensure face_landmarker.task is downloaded.")
        sys.exit(1)
        
    try:
        from ultralytics import YOLO
        yolo_model = YOLO(yolo_model_path) if os.path.exists(yolo_model_path) else None
        if not yolo_model:
            print(f"Warning: YOLOv8 model not found at {yolo_model_path}. Object detection disabled.")
    except ImportError:
        print("Warning: ultralytics package not found. YOLO object detection disabled.")
        yolo_model = None

    base_options = python.BaseOptions(model_asset_path=model_path)
    options = vision.FaceLandmarkerOptions(
        base_options=base_options,
        output_face_blendshapes=False,
        output_facial_transformation_matrixes=False,
        num_faces=1)
    
    detector = vision.FaceLandmarker.create_from_options(options)

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Could not open camera.")
        return

    while cap.isOpened():
        success, image = cap.read()
        if not success:
            continue

        image = cv2.flip(image, 1)
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Convert to MediaPipe Image object
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
        
        # Detect face landmarks
        detection_result = detector.detect(mp_image)

        # Draw the face mesh
        annotated_image = draw_landmarks_on_image(rgb_image, detection_result)

        h, w, _ = annotated_image.shape
        status_text = "Status: OK (Looking Forward)"
        status_color = (0, 255, 0)
        cheating_alert = False
        gaze_direction = "Center"
        
        if detection_result.face_landmarks:
            face_landmarks = detection_result.face_landmarks[0]
            
            # Use specific eye points to track where the Iris is positioned relative to the eye corners
            # Right eye (from user perspective looking at screen)
            right_eye_left = face_landmarks[362]
            right_eye_right = face_landmarks[263]
            right_eye_top = face_landmarks[386]
            right_eye_bottom = face_landmarks[374]
            right_iris_center = face_landmarks[473] # Center of right iris
            
            # Left eye
            left_eye_left = face_landmarks[33]
            left_eye_right = face_landmarks[133]
            left_eye_top = face_landmarks[159]
            left_eye_bottom = face_landmarks[145]
            left_iris_center = face_landmarks[468] # Center of left iris

            # Calculate Horizontal Gaze (ratio of iris between eye corners)
            horiz_ratio_r = (right_iris_center.x - right_eye_left.x) / (right_eye_right.x - right_eye_left.x + 0.0001)
            horiz_ratio_l = (left_iris_center.x - left_eye_left.x) / (left_eye_right.x - left_eye_left.x + 0.0001)
            avg_horiz = (horiz_ratio_r + horiz_ratio_l) / 2.0
            
            # Calculate Vertical Gaze (ratio of iris between top and bottom eyelids)
            vert_ratio_r = (right_iris_center.y - right_eye_top.y) / (right_eye_bottom.y - right_eye_top.y + 0.0001)
            vert_ratio_l = (left_iris_center.y - left_eye_top.y) / (left_eye_bottom.y - left_eye_top.y + 0.0001)
            avg_vert = (vert_ratio_r + vert_ratio_l) / 2.0

            # Inverse the horizontal values due to the camera mirror flip
            if avg_horiz < 0.40:
                gaze_direction = "Looking Right"
                status_color = (0, 165, 255) 
                cheating_alert = True
            elif avg_horiz > 0.58:
                gaze_direction = "Looking Left"
                status_color = (0, 165, 255) 
                cheating_alert = True
            elif avg_vert < 0.38:
                gaze_direction = "Looking Up"
                status_color = (0, 165, 255)
                cheating_alert = True
            elif avg_vert > 0.65:
                gaze_direction = "Looking Down"
                status_color = (0, 165, 255)
                cheating_alert = True

            cv2.putText(annotated_image, f"Gaze: {gaze_direction}", (20, 80), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, status_color, 2)
                
        else:
            status_color = (0, 0, 255)
            cheating_alert = True
            
        cv2.putText(annotated_image, status_text, (20, 40), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, status_color, 2)
                    
        # --- Object Detection (Phone Tracking) ---
        phone_detected = False
        if yolo_model:
            results = yolo_model(image, classes=[67], verbose=False) # 67 is usually cell phone in COCO
            for r in results:
                boxes = r.boxes
                for box in boxes:
                    phone_detected = True
                    b = box.xyxy[0].cpu().numpy().astype(int)
                    # Draw Red Box for Phone
                    cv2.rectangle(annotated_image, (b[0], b[1]), (b[2], b[3]), (0, 0, 255), 2)
                    cv2.putText(annotated_image, "! PHONE DETECTED !", (b[0], b[1] - 10), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

        if cheating_alert or phone_detected:
            msg = "CHEATING BEHAVIOR DETECTED!" if phone_detected else "EYE / HEAD MOVEMENT DETECTED"
            cv2.putText(annotated_image, msg, (20, h - 30), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 3)

        cv2.imshow('OralIQ - AI Face Tracking Demo', annotated_image)
        
        if cv2.waitKey(5) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    run_face_demo()
