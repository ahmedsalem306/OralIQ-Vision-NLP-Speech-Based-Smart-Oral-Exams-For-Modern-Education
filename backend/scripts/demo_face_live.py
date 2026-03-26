import cv2
import numpy as np
import os

def run_face_demo():
    # Load the pre-trained Haar Cascades
    face_cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
    eye_cascade_path = cv2.data.haarcascades + 'haarcascade_eye.xml'
    
    face_cascade = cv2.CascadeClassifier(face_cascade_path)
    eye_cascade = cv2.CascadeClassifier(eye_cascade_path)
    
    if face_cascade.empty() or eye_cascade.empty():
        print("Error: Could not load cascade classifiers.")
        return

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Could not open camera.")
        return

    print("--- OralIQ AI Monitoring Demo (Pupil Gaze Detection) ---")
    print("Logic: Tracks pupil position for left/right gaze detection.")
    print("Press 'q' to quit.")

    while cap.isOpened():
        success, image = cap.read()
        if not success:
            continue

        image = cv2.flip(image, 1)
        h, w, _ = image.shape
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # 1. Detect Face
        faces = face_cascade.detectMultiScale(gray, 1.3, 5, minSize=(150, 150))

        status_text = "Status: OK (Looking Forward)"
        status_color = (0, 255, 0)
        cheating_alert = False
        gaze_direction = "Center"

        if len(faces) == 0:
            status_text = "WARNING: No Face Detected!"
            status_color = (0, 0, 255)
            cheating_alert = True
        else:
            for (x, y, fw, fh) in faces:
                cv2.rectangle(image, (x, y), (x+fw, y+fh), (255, 255, 255), 1)
                
                # 2. Detect Eyes
                roi_gray = gray[y:y+fh, x:x+fw]
                roi_color = image[y:y+fh, x:x+fw]
                eyes = eye_cascade.detectMultiScale(roi_gray, 1.1, 10, minSize=(30, 30))
                
                eye_list = []
                for (ex, ey, ew, eh) in eyes:
                    if ey < fh / 2: # Focus on upper face
                        eye_list.append((ex, ey, ew, eh))

                # If eyes found, try to track pupil in the first eye
                if len(eye_list) > 0:
                    ex, ey, ew, eh = eye_list[0]
                    eye_roi = roi_gray[ey:ey+eh, ex:ex+ew]
                    
                    # 3. Pupil Tracking Logic (Simplified)
                    # Use thresholding to find the darkest spot
                    _, threshold = cv2.threshold(eye_roi, 50, 255, cv2.THRESH_BINARY_INV)
                    contours, _ = cv2.findContours(threshold, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
                    
                    if contours:
                        # Assume the largest contour in the eye is the pupil/iris
                        largest_contour = max(contours, key=cv2.contourArea)
                        (mx, my), radius = cv2.minEnclosingCircle(largest_contour)
                        
                        # Draw pupil point
                        cv2.circle(roi_color, (int(ex + mx), int(ey + my)), 2, (0, 0, 255), -1)
                        
                        # Calculate relative horizontal position (0.0 to 1.0)
                        rel_x = mx / ew
                        
                        if rel_x < 0.42:
                            gaze_direction = "Left"
                            status_text = "WARNING: Looking Left!"
                            status_color = (0, 165, 255)
                            cheating_alert = True
                        elif rel_x > 0.58:
                            gaze_direction = "Right"
                            status_text = "WARNING: Looking Right!"
                            status_color = (0, 165, 255)
                            cheating_alert = True
                        else:
                            gaze_direction = "Center"

                cv2.putText(image, f"Gaze: {gaze_direction}", (x, y-10), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, status_color, 2)

        # UI Elements
        cv2.putText(image, status_text, (20, 40), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, status_color, 2)
        
        if cheating_alert:
            cv2.putText(image, "EYE MOVEMENT DETECTED", (20, h - 30), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 3)

        cv2.imshow('OralIQ - Pupil Gaze Demo', image)
        
        if cv2.waitKey(5) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    run_face_demo()
