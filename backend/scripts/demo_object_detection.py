from ultralytics import YOLO
import cv2
import os

def run_object_detection_demo():
    print("\n--- OralIQ AI Pro: Object Detection Demo ---")
    print("Loading YOLOv8-Nano (Fastest Model)...")
    
    # Load a pretrained YOLOv8n model
    model = YOLO('yolov8n.pt') 

    # Defined classes we care about (from COCO dataset)
    # 0: person, 63: laptop, 67: cell phone, 73: book
    target_classes = {0: "Person", 67: "CELL PHONE", 73: "BOOK"}
    
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Could not open camera.")
        return

    print("AI Monitoring Active. Logic: Detecting Prohibited Items (Phones, Books).")
    print("Press 'q' to quit.")

    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            continue

        frame = cv2.flip(frame, 1)
        h, w, _ = frame.shape

        # Run inference
        results = model(frame, stream=True, verbose=False)

        cheating_risk = False
        detections_found = []

        for r in results:
            boxes = r.boxes
            for box in boxes:
                cls_id = int(box.cls[0])
                
                # Check if detected object is in our target list
                if cls_id in target_classes:
                    name = target_classes[cls_id]
                    conf = float(box.conf[0])
                    
                    if conf > 0.4: # Probability threshold
                        # Get box coordinates
                        x1, y1, x2, y2 = box.xyxy[0]
                        x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
                        
                        # Set color based on risk
                        color = (0, 255, 0) # Green for person
                        if cls_id in [67, 73]: # Red for phone/book
                            color = (0, 0, 255)
                            cheating_risk = True
                        
                        # Draw box and label
                        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                        cv2.putText(frame, f"{name} {conf:.2f}", (x1, y1 - 10),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                        
                        detections_found.append(name)

        # UI Indicators
        if cheating_risk:
            cv2.rectangle(frame, (0, 0), (w, 60), (0, 0, 255), -1)
            cv2.putText(frame, "PROHIBITED ITEM DETECTED!", (20, 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        else:
            cv2.putText(frame, "AI Status: Secure", (20, 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

        cv2.imshow('OralIQ - Advanced Anti-Cheat Demo', frame)
        
        if cv2.waitKey(5) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    run_object_detection_demo()
