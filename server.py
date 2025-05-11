import socket
import json
import csv
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, db

# ---------- Firebase Setup ----------
cred = credentials.Certificate("mentionyours")
firebase_admin.initialize_app(cred, {
    'databaseURL': 'mentionyours'
})

# ---------- Server Setup ----------
server_ip = "0.0.0.0"  # Listen on all interfaces
server_port = 12345

server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server_socket.bind((server_ip, server_port))
server_socket.listen(5)

print(f"Server listening on {server_ip}:{server_port}...")

# ---------- CSV Setup ----------
csv_filename = "sensor_data.csv"
csv_headers = ["Timestamp", "HeartRate", "SpO2", "AccelX", "AccelY", "AccelZ", "GyroX", "GyroY", "GyroZ", "FallDetected", "BPWarning", "FallWarning"]

# Write headers if CSV is empty
with open(csv_filename, mode='a', newline='') as file:
    if file.tell() == 0:
        writer = csv.writer(file)
        writer.writerow(csv_headers)

# ---------- Main Loop ----------
while True:
    client_socket, client_address = server_socket.accept()
    print(f"Connection from {client_address} established.")

    try:
        while True:
            data = client_socket.recv(1024)
            if not data:
                break

            payload = json.loads(data.decode())

            # Extract values
            timestamp = payload["Timestamp"]
            heart_rate = payload["HeartRate"]
            spo2 = payload["SpO2"]
            accel_x = payload["AccelX"]
            accel_y = payload["AccelY"]
            accel_z = payload["AccelZ"]
            gyro_x = payload["GyroX"]
            gyro_y = payload["GyroY"]
            gyro_z = payload["GyroZ"]
            fall_detected = payload["FallDetected"]
            bp_warning = payload["BPWarning"]
            fall_warning = payload["FallWarning"]

            # Print received data and warnings
            print(f"Received data at {timestamp}:")
            print(f"Heart Rate: {heart_rate}, SpO2: {spo2}, Fall Detected: {fall_detected}")
            print(f"BP Warning: {bp_warning if bp_warning else 'None'}")
            print(f"Fall Warning: {fall_warning if fall_warning else 'None'}")
            print("-" * 40)

            # ---------- CSV Logging ----------
            with open(csv_filename, mode='a', newline='') as file:
                writer = csv.writer(file)
                writer.writerow([timestamp, heart_rate, spo2, accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z, fall_detected, bp_warning, fall_warning])

            # ---------- Firebase Real-Time Update ----------
            # Update real-time data (current status)
            db.reference('realtime_data').set({
                "HeartRate": heart_rate,
                "SpO2": spo2,
                "FallDetected": fall_detected,
                "BPWarning": bp_warning,
                "FallWarning": fall_warning
            })

            # ---------- Firebase Logs ----------
            formatted_timestamp = timestamp.replace(":", "_").replace(".", "_")  # Format the timestamp to remove illegal characters
            db.reference('logs').child(formatted_timestamp).set({
                "HeartRate": heart_rate,
                "SpO2": spo2,
                "AccelX": accel_x,
                "AccelY": accel_y,
                "AccelZ": accel_z,
                "GyroX": gyro_x,
                "GyroY": gyro_y,
                "GyroZ": gyro_z,
                "FallDetected": fall_detected,
                "BPWarning": bp_warning,
                "FallWarning": fall_warning
            })

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client_socket.close()
