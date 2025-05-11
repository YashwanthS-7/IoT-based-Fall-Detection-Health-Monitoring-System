import time
from datetime import datetime
import math
from mpu6050 import mpu6050
from max30100 import MAX30100
import socket
import json
import RPi.GPIO as GPIO  # For buzzer

# Buzzer Setup
BUZZER_PIN = 18  # Adjust based on your GPIO pin
GPIO.setmode(GPIO.BCM)
GPIO.setup(BUZZER_PIN, GPIO.OUT)

def buzzer_alert(alert_type):
    if alert_type == "BP":
        for _ in range(2):  # Short beeps
            GPIO.output(BUZZER_PIN, GPIO.HIGH)
            time.sleep(0.3)
            GPIO.output(BUZZER_PIN, GPIO.LOW)
            time.sleep(0.3)
    elif alert_type == "Fall":
        GPIO.output(BUZZER_PIN, GPIO.HIGH)  # Long beep
        time.sleep(1)
        GPIO.output(BUZZER_PIN, GPIO.LOW)
        time.sleep(1)

# Server (Receiver) settings
server_ip = "192.168.124.227"
server_port = 12345
client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
client_socket.connect((server_ip, server_port))

# Sensor Initialization
try:
    mpu = mpu6050(0x68)
except Exception as e:
    print("MPU6050 initialization error:", e)
    exit()

try:
    max30100 = MAX30100()
    max30100.enable_spo2()
except Exception as e:
    print("MAX30100 initialization error:", e)
    exit()

previous_accel_data = None

def detect_fall(accel_x, accel_y, accel_z):
    global previous_accel_data
    if previous_accel_data is None:
        previous_accel_data = (accel_x, accel_y, accel_z)
        return False
    current = math.sqrt(accel_x**2 + accel_y**2 + accel_z**2)
    previous = math.sqrt(previous_accel_data[0]**2 + previous_accel_data[1]**2 + previous_accel_data[2]**2)
    change = abs(current - previous)
    previous_accel_data = (accel_x, accel_y, accel_z)
    return change > 2.5

def calculate_heart_rate(ir_value):
    return ir_value % 100  # Placeholder

def calculate_spo2(red_value, ir_value):
    return 95 + (ir_value - red_value) % 5  # Placeholder

def send_data_to_server(data):
    message = json.dumps(data)
    client_socket.sendall(message.encode())
    print(f"Data sent to server: {data}")

def get_sensor_data():
    timestamp = datetime.now().isoformat()

    max30100.read_sensor()
    ir = max30100.ir
    red = max30100.red

    heart_rate = calculate_heart_rate(ir)
    spo2 = calculate_spo2(red, ir)

    accel = mpu.get_accel_data()
    gyro = mpu.get_gyro_data()
    fall_detected = detect_fall(accel['x'], accel['y'], accel['z'])

    # --- Warning & Recommendation Logic ---
    bp_warning = None
    fall_warning = None

    if heart_rate < 60:
        bp_warning = "BP too low – Stay hydrated and consult a doctor if symptoms persist."
        buzzer_alert("BP")
    elif heart_rate > 100:
        bp_warning = "BP too high – Relax and monitor again soon."
        buzzer_alert("BP")

    if fall_detected:
        fall_warning = "Fall detected – Check surroundings and ensure safety."
        buzzer_alert("Fall")

    # Print output
    print(f"Timestamp: {timestamp}")
    print(f"Heart Rate: {heart_rate} bpm")
    print(f"SpO2: {spo2}%")
    print(f"AccelX: {accel['x']}, AccelY: {accel['y']}, AccelZ: {accel['z']}")
    print(f"GyroX: {gyro['x']}, GyroY: {gyro['y']}, GyroZ: {gyro['z']}")
    print(f"Fall Detected: {fall_detected}")
    print(f"BP Warning: {bp_warning if bp_warning else 'None'}")
    print(f"Fall Warning: {fall_warning if fall_warning else 'None'}")
    print("-" * 50)

    data = {
        "Timestamp": timestamp,
        "HeartRate": heart_rate,
        "SpO2": spo2,
        "AccelX": accel['x'],
        "AccelY": accel['y'],
        "AccelZ": accel['z'],
        "GyroX": gyro['x'],
        "GyroY": gyro['y'],
        "GyroZ": gyro['z'],
        "FallDetected": fall_detected,
        "BPWarning": bp_warning if bp_warning else "None",
        "FallWarning": fall_warning if fall_warning else "None"
    }

    send_data_to_server(data)

if __name__ == "__main__":
    try:
        while True:
            get_sensor_data()
            time.sleep(1)
    except KeyboardInterrupt:
        print("Interrupted by user.")
    finally:
        GPIO.cleanup()
        client_socket.close()
