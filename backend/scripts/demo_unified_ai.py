import cv2
import numpy as np
from ultralytics import YOLO
import os

# ─────────────────────────────────────────────────────────
#  68-Point Landmark Gaze Tracker v2
#  Fix: Uses eye CORNER landmarks for accurate L/R ratio
#  New: Vertical gaze (looking down), multiple people
# ─────────────────────────────────────────────────────────

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, "lbfmodel.yaml")

# Thresholds (tune these)
GAZE_H_LEFT   = 0.28   # horizontal iris < this → extreme left
GAZE_H_RIGHT  = 0.72   # horizontal iris > this → extreme right
GAZE_V_DOWN   = 0.72   # vertical iris > this   → looking far down
HEAD_YAW      = 0.18   # face center offset     → hard head turn
OBJ_CONF      = 0.12   # YOLO object confidence


def iris_position(eye_pts, gray):
    """
    Given 6 eye landmark points, calculate iris position relative to
    the eye corners (not bounding box) for accurate left/right/up/down.
    Returns (h_ratio, v_ratio, center_point)
      h_ratio: 0.0 = looking left, 1.0 = looking right
      v_ratio: 0.0 = looking up,   1.0 = looking down
    """
    pts = np.array(eye_pts, dtype=np.int32)

    # Eye corners: leftmost point and rightmost point
    left_corner  = min(eye_pts, key=lambda p: p[0])
    right_corner = max(eye_pts, key=lambda p: p[0])
    top_corner   = min(eye_pts, key=lambda p: p[1])
    bot_corner   = max(eye_pts, key=lambda p: p[1])

    eye_width  = right_corner[0] - left_corner[0]
    eye_height = bot_corner[1] - top_corner[1]

    if eye_width < 5 or eye_height < 3:
        return 0.5, 0.5, None

    # Crop eye region with small padding
    ex, ey, ew, eh = cv2.boundingRect(pts)
    pad = 2
    ex1 = max(0, ex - pad)
    ey1 = max(0, ey - pad)
    ex2 = min(gray.shape[1], ex + ew + pad)
    ey2 = min(gray.shape[0], ey + eh + pad)

    eye_roi = gray[ey1:ey2, ex1:ex2].copy()
    eye_roi = cv2.GaussianBlur(eye_roi, (5, 5), 0)

    # Darkest pixel = iris
    _, _, min_loc, _ = cv2.minMaxLoc(eye_roi)
    iris_x = ex1 + min_loc[0]
    iris_y = ey1 + min_loc[1]

    # Ratio relative to eye CORNERS (not bounding box)
    h_ratio = (iris_x - left_corner[0]) / eye_width
    v_ratio = (iris_y - top_corner[1]) / max(eye_height, 1)

    # Clamp to 0-1
    h_ratio = max(0.0, min(1.0, h_ratio))
    v_ratio = max(0.0, min(1.0, v_ratio))

    return h_ratio, v_ratio, (iris_x, iris_y)


def run_unified_demo():
    print("\n═══════════════════════════════════════════")
    print("  OralIQ: 68-Point Gaze Tracker v2")
    print("  Extreme gaze L/R/Down + Head + Objects")
    print("═══════════════════════════════════════════")

    if not os.path.exists(MODEL_PATH):
        print(f"ERROR: {MODEL_PATH} not found"); return

    yolo = YOLO('yolov8n.pt')
    obj_labels = {67: "PHONE", 73: "BOOK", 39: "BOTTLE", 41: "CUP", 64: "MOUSE"}

    face_det    = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    profile_det = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_profileface.xml')

    facemark = cv2.face.createFacemarkLBF()
    facemark.loadModel(MODEL_PATH)
    print("Model loaded. Press 'q' to quit.\n")

    cap = cv2.VideoCapture(0)

    while cap.isOpened():
        ok, frame = cap.read()
        if not ok: break

        frame = cv2.flip(frame, 1)
        h, w = frame.shape[:2]
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        risk   = False
        alerts = []

        # ── 1. Object Detection ───────────────────────────────────────
        for r in yolo(frame, verbose=False, conf=OBJ_CONF):
            for box in r.boxes:
                cls = int(box.cls[0])
                if cls in obj_labels:
                    x1,y1,x2,y2 = map(int, box.xyxy[0])
                    risk = True
                    alerts.append(f"HOLDING {obj_labels[cls]}")
                    cv2.rectangle(frame,(x1,y1),(x2,y2),(0,0,255),3)
                    cv2.putText(frame, obj_labels[cls],(x1,y1-8),
                                cv2.FONT_HERSHEY_SIMPLEX,0.7,(0,0,255),2)

        # ── 2. Multiple person check (YOLO person count) ─────────────
        person_count = 0
        for r in yolo(frame, verbose=False, conf=0.30):
            for box in r.boxes:
                if int(box.cls[0]) == 0:
                    person_count += 1
        if person_count > 1:
            risk = True; alerts.append(f"MULTIPLE PEOPLE ({person_count})")

        # ── 3. Face Detection ─────────────────────────────────────────
        faces = face_det.detectMultiScale(gray, 1.2, 6, minSize=(120,120))

        if len(faces) == 0:
            sides = profile_det.detectMultiScale(gray, 1.1, 5, minSize=(100,100))
            if len(sides) > 0:
                risk = True; alerts.append("HEAD TURNED SIDEWAYS")
                for (sx,sy,sw,sh) in sides:
                    cv2.rectangle(frame,(sx,sy),(sx+sw,sy+sh),(0,0,255),2)
            else:
                risk = True; alerts.append("NO FACE DETECTED")
        else:
            bx,by,bw,bh = max(faces, key=lambda f: f[2]*f[3])
            cv2.rectangle(frame,(bx,by),(bx+bw,by+bh),(200,200,200),1)

            # Head yaw
            yaw = (bx + bw//2 - w//2) / w
            if yaw > HEAD_YAW:
                risk = True; alerts.append("HEAD TURN RIGHT")
            elif yaw < -HEAD_YAW:
                risk = True; alerts.append("HEAD TURN LEFT")

            # ── 4. Landmarks → Gaze ──────────────────────────────────
            faces_rect = np.array([[bx, by, bw, bh]])
            success, landmarks = facemark.fit(gray, faces_rect)

            if success and len(landmarks) > 0:
                lm = landmarks[0][0]

                # Draw landmarks
                for pt in lm:
                    cv2.circle(frame,(int(pt[0]),int(pt[1])),1,(0,180,0),-1)

                # Eyes
                left_eye  = [(int(lm[i][0]),int(lm[i][1])) for i in range(36,42)]
                right_eye = [(int(lm[i][0]),int(lm[i][1])) for i in range(42,48)]

                cv2.polylines(frame,[np.array(left_eye)],True,(0,165,255),1)
                cv2.polylines(frame,[np.array(right_eye)],True,(0,165,255),1)

                # Iris tracking (corner-relative)
                lh, lv, lc = iris_position(left_eye, gray)
                rh, rv, rc = iris_position(right_eye, gray)

                if lc: cv2.circle(frame, lc, 3, (0,0,255), -1)
                if rc: cv2.circle(frame, rc, 3, (0,0,255), -1)

                avg_h = (lh + rh) / 2.0
                avg_v = (lv + rv) / 2.0

                # Debug values
                cv2.putText(frame, f"H:{avg_h:.2f} V:{avg_v:.2f}",
                            (w-170, h-15), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180,180,180), 1)

                # Horizontal gaze
                if avg_h < GAZE_H_LEFT:
                    risk = True; alerts.append("EXTREME GAZE LEFT")
                elif avg_h > GAZE_H_RIGHT:
                    risk = True; alerts.append("EXTREME GAZE RIGHT")

                # Vertical gaze (looking far down — not just at laptop)
                if avg_v > GAZE_V_DOWN:
                    risk = True; alerts.append("LOOKING FAR DOWN")

        # ── 5. UI ─────────────────────────────────────────────────────
        if risk:
            cv2.rectangle(frame,(0,0),(w,90),(0,0,200),-1)
            cv2.putText(frame,"!!! SECURITY RISK !!!",(w//2-175,45),
                        cv2.FONT_HERSHEY_DUPLEX,1.1,(255,255,255),2)
            yp = 115
            for a in list(set(alerts)):
                cv2.putText(frame,f"> {a}",(25,yp),
                            cv2.FONT_HERSHEY_SIMPLEX,0.75,(0,0,255),2)
                yp += 28
        else:
            cv2.rectangle(frame,(0,0),(w,40),(0,150,0),-1)
            cv2.putText(frame,"STATUS: SECURE",(15,28),
                        cv2.FONT_HERSHEY_SIMPLEX,0.7,(255,255,255),2)

        cv2.imshow('OralIQ - Gaze Tracker v2', frame)
        if cv2.waitKey(5) & 0xFF == ord('q'): break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    run_unified_demo()
