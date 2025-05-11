# 🏥 Smart Health Monitoring System

A **real-time health monitoring system** designed to track **heart rate**, **blood oxygen (SpO2)** levels, and detect **falls**. The system sends immediate alerts and visualizes data through a dashboard with Firebase integration and a built-in chatbot.

---

## 🎯 Project Goal

To develop a comprehensive IoT-based health monitoring solution that:
- Continuously tracks vital signs (Heart Rate, SpO2)
- Detects sudden falls using motion sensors
- Sends real-time data and alerts via Firebase
- Offers first-aid tips through a chatbot
- Provides a clean React-based web dashboard for visualization

---

## 🧩 Key Components

### 🔬 Sensors
- **MAX30100**: Heart rate and SpO2 sensor
- **MPU6050**: Accelerometer + Gyroscope for fall detection

### 💻 Client (Raspberry Pi)
- Reads data from sensors
- Detects abnormalities (low/high heart rate or fall)
- Sends data and warnings to server via socket
- Alerts via buzzer for emergency conditions

### 🖥️ Server (Python)
- Receives and processes sensor data
- Forwards it to Firebase in real-time

### ☁️ Firebase
- Realtime Database to store and sync sensor data
- Enables live updates on the web dashboard

### 🌐 Web Application (React.js)
- Displays heart rate, SpO2, fall status, and future temperature integration
- Live graphs for heart rate and oxygen levels
- Logs tab to view historical data
- Built-in chatbot for first aid tips

