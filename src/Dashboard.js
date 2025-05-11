import { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { AlertTriangle, Heart, Activity, Droplets, Clock, User, Database, MessageSquare, Download, Send, Shield, Moon, Bell, Battery, Thermometer } from 'lucide-react';

// Firebase imports
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, get, query, orderByKey, limitToLast } from 'firebase/database';

// Firebase configuration with your actual credentials
const firebaseConfig = {
  mentionyours
};

// First aid chat responses
const firstAidResponses = {
    "fall": "If someone has fallen: 1. Check for responsiveness and breathing. 2. Don't move them if you suspect head/neck/spine injury. 3. If they're unconscious, call emergency services immediately. 4. If they're conscious, help them to a comfortable position and check for injuries. 5. Apply ice or a cold pack if there are any bruises or swelling, but avoid placing it directly on the skin.",
    "low blood pressure": "For low blood pressure: 1. Sit or lie down immediately. 2. Drink water to increase fluids. 3. Consume some salt if not contraindicated by other conditions. 4. Move legs to improve circulation. 5. Seek medical help if symptoms persist or worsen. 6. Avoid sudden changes in posture. 7. Eat small, frequent meals to prevent drops in blood pressure.",
    "high blood pressure": "For high blood pressure emergency: 1. Sit down and rest. 2. Take deep breaths. 3. If you take BP medication, ensure you've taken it. 4. Call emergency services if you have severe headache, vision problems, chest pain, or difficulty breathing. 5. Avoid caffeine, alcohol, and excessive salt.",
    "oxygen": "For low oxygen levels: 1. Sit upright to maximize lung capacity. 2. Take slow, deep breaths. 3. Move to fresh air if possible. 4. Seek emergency help if experiencing chest pain, severe shortness of breath, or bluish lips/face. 5. If available, use supplemental oxygen as prescribed by a doctor.",
    "heart rate": "For abnormal heart rate: 1. Sit down and rest. 2. Take slow, deep breaths. 3. Avoid caffeine and stimulants. 4. If heart rate is very high or accompanied by chest pain, dizziness, or shortness of breath, seek emergency help. 5. Check for any known heart conditions or medications that may be affecting heart rate.",
    "default": "I can provide basic first aid information for common emergencies. Try asking about 'fall', 'low blood pressure', 'high blood pressure', or 'oxygen levels'.",
    "low heart rate": "For low heart rate: 1. Sit down and relax. 2. Take deep breaths. 3. Avoid stress or sudden movements. 4. If symptoms persist, seek medical attention immediately. 5. Check if you have a heart condition that may require attention. 6. Drink water to maintain hydration levels.",
    "dizziness": "For dizziness: 1. Sit or lie down immediately to prevent falling. 2. Drink water to ensure proper hydration. 3. Avoid sudden movements and try to rest. 4. If dizziness persists or is accompanied by fainting, seek medical help.",
    "shortness of breath": "For shortness of breath: 1. Sit down and try to stay calm. 2. Take slow, deep breaths to reduce panic. 3. Avoid physical activity. 4. If symptoms persist or worsen, call emergency services.",
    "chest pain": "For chest pain: 1. Sit down and rest. 2. If you have a history of heart problems, take prescribed medication if available. 3. Chew an aspirin (if not contraindicated). 4. Seek emergency medical help immediately if chest pain persists, especially if accompanied by shortness of breath, dizziness, or nausea."
  };  

export default function Dashboard() {
  // Initialize Firebase
  const [firebaseApp, setFirebaseApp] = useState(null);
  const [database, setDatabase] = useState(null);
  const [currentData, setCurrentData] = useState({
    HeartRate: 54, // Changed to match screenshot showing low heart rate
    SpO2: 98,
    BPWarning: "Low Heart Rate - Potential Low Blood Pressure",
    FallDetected: false,
    FallWarning: "No fall detected",
    timestamp: Date.now()
  });
  const [historicalData, setHistoricalData] = useState([]);
  const [view, setView] = useState('dashboard'); // 'dashboard', 'logs', or 'chat'
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: "Hello! I can help with first aid questions. What would you like to know?" }
  ]);
  const [chartData, setChartData] = useState([
    {time: '2:30', HeartRate: 55, SpO2: 97},
    {time: '2:31', HeartRate: 54, SpO2: 98},
    {time: '2:32', HeartRate: 53, SpO2: 97},
    {time: '2:33', HeartRate: 55, SpO2: 98},
    {time: '2:34', HeartRate: 56, SpO2: 98},
    {time: '2:35', HeartRate: 54, SpO2: 99},
    {time: '2:36', HeartRate: 53, SpO2: 98},
    {time: '2:37', HeartRate: 52, SpO2: 97},
    {time: '2:38', HeartRate: 54, SpO2: 98},
  ]);
  const [notificationCount, setNotificationCount] = useState(1);
  const [darkMode, setDarkMode] = useState(true);
  
  // Initialize Firebase when component mounts
  useEffect(() => {
    try {
      const app = initializeApp(firebaseConfig);
      setFirebaseApp(app);
      const db = getDatabase(app);
      setDatabase(db);
    } catch (error) {
      console.error("Error initializing Firebase:", error);
    }
  }, []);

  // Subscribe to real-time data
  useEffect(() => {
    if (!database) return;

    // We'll look for realtime_data, but if not available, we'll take the latest log entry
    const realtimeDataRef = ref(database, 'realtime_data');
    
    // Subscribe to realtime updates or latest log
    const unsubscribe = onValue(realtimeDataRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // If realtime_data exists, use it
        processRealtimeData(data);
      } else {
        // If realtime_data doesn't exist, get latest log entry
        getLatestLog();
      }
    }, (error) => {
      console.error("Error subscribing to realtime data:", error);
      // Fallback to latest log if realtime data subscription fails
      getLatestLog();
    });
    
    // Get historical logs
    fetchHistoricalLogs();

    return () => unsubscribe();
  }, [database]);

  // Process realtime data
  const processRealtimeData = (data) => {
    // Handle data based on structure we observed
    const newData = {
      HeartRate: data.HeartRate || 54,
      SpO2: data.SpO2 || 98,
      // If BPWarning doesn't exist, derive from heart rate
      BPWarning: data.BPWarning || deriveBPWarning(data.HeartRate),
      FallDetected: data.FallDetected || false,
      FallWarning: data.FallWarning || (data.FallDetected ? "Fall Detected!" : "No fall detected"),
      timestamp: Date.now()
    };
    
    updateCurrentData(newData);
  };

  // Get latest log entry
  const getLatestLog = () => {
    if (!database) return;
    
    const logsRef = query(ref(database, 'logs'), orderByKey(), limitToLast(1));
    get(logsRef).then((snapshot) => {
      if (snapshot.exists()) {
        const logsData = snapshot.val();
        const latestLogKey = Object.keys(logsData)[0];
        const latestLog = logsData[latestLogKey];
        
        // Process log data format
        const newData = {
          HeartRate: latestLog.HeartRate || 54,
          SpO2: latestLog.SpO2 || 98,
          // Derive BP warning if not available
          BPWarning: deriveBPWarning(latestLog.HeartRate),
          FallDetected: latestLog.FallDetected || false,
          FallWarning: latestLog.FallDetected ? "Fall Detected!" : "No fall detected",
          timestamp: new Date(latestLogKey.replace(/_/g, ':')).getTime() || Date.now()
        };
        
        updateCurrentData(newData);
      }
    }).catch((error) => {
      console.error("Error fetching latest log:", error);
    });
  };

  // Fetch historical logs
  const fetchHistoricalLogs = () => {
    if (!database) return;
    
    const logsRef = query(ref(database, 'logs'), orderByKey(), limitToLast(50));
    get(logsRef).then((snapshot) => {
      if (snapshot.exists()) {
        const logsData = snapshot.val();
        const logsArray = Object.keys(logsData).map(key => {
          const log = logsData[key];
          // Convert timestamp format from 2025-05-10T01_39_11_869684 to Date
          const timestamp = new Date(key.replace(/_/g, ':')).getTime();
          
          return {
            id: key,
            HeartRate: log.HeartRate || 0,
            SpO2: log.SpO2 || 0,
            AccelX: log.AccelX,
            AccelY: log.AccelY,
            AccelZ: log.AccelZ,
            GyroX: log.GyroX,
            GyroY: log.GyroY,
            GyroZ: log.GyroZ,
            BPWarning: deriveBPWarning(log.HeartRate),
            FallDetected: log.FallDetected || false,
            FallWarning: log.FallDetected ? "Fall Detected!" : "No fall detected",
            timestamp: timestamp
          };
        });
        
        // Sort by timestamp (newest first)
        logsArray.sort((a, b) => b.timestamp - a.timestamp);
        
        setHistoricalData(logsArray);
      }
    }).catch((error) => {
      console.error("Error fetching logs:", error);
    });
  };

  // Update current data and chart
  const updateCurrentData = (newData) => {
    setCurrentData(newData);
    
    // Add to chart data (keep last 20 entries)
    setChartData(prev => {
      const newChartData = [...prev, {
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        HeartRate: newData.HeartRate,
        SpO2: newData.SpO2
      }];
      
      if (newChartData.length > 20) {
        return newChartData.slice(newChartData.length - 20);
      }
      return newChartData;
    });
  };

  // Derive blood pressure warning from heart rate
  const deriveBPWarning = (heartRate) => {
    if (!heartRate) return "Unknown";
    if (heartRate < 60) return "Low Heart Rate - Potential Low Blood Pressure";
    if (heartRate > 100) return "High Heart Rate - Potential High Blood Pressure";
    return "Normal";
  };

  // Handle chat submission
  const handleChatSubmit = () => {
    if (!chatInput.trim()) return;
    
    // Add user message
    setChatMessages(prev => [...prev, { sender: 'user', text: chatInput }]);
    
    // Generate response
    let response = firstAidResponses.default;
    const input = chatInput.toLowerCase();
    
    // Check for keywords
    Object.keys(firstAidResponses).forEach(key => {
      if (input.includes(key)) {
        response = firstAidResponses[key];
      }
    });
    
    // Add bot response after a small delay
    setTimeout(() => {
      setChatMessages(prev => [...prev, { sender: 'bot', text: response }]);
    }, 600);
    
    setChatInput('');
  };

  // Download logs as CSV
  const downloadCSV = () => {
    if (historicalData.length === 0) return;
    
    // Convert logs to CSV format including accelerometer and gyroscope data
    const headers = ['Timestamp', 'Heart Rate', 'SpO2', 'AccelX', 'AccelY', 'AccelZ', 'GyroX', 'GyroY', 'GyroZ', 'BP Warning', 'Fall Detected'];
    const rows = historicalData.map(log => [
      new Date(log.timestamp).toISOString(),
      log.HeartRate,
      log.SpO2,
      log.AccelX || 'N/A',
      log.AccelY || 'N/A',
      log.AccelZ || 'N/A',
      log.GyroX || 'N/A',
      log.GyroY || 'N/A',
      log.GyroZ || 'N/A',
      log.BPWarning,
      log.FallDetected ? 'Yes' : 'No'
    ]);
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create a Blob and download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health_logs_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get health status class based on value
  const getStatusColorClass = (value, type) => {
    if (type === 'heart') {
      if (value < 60 || value > 100) return "text-red-500";
      else if (value < 65 || value > 95) return "text-yellow-500";
      return "text-emerald-500";
    } else if (type === 'spo2') {
      if (value < 90) return "text-red-500";
      else if (value < 95) return "text-yellow-500";
      return "text-emerald-500";
    } else if (type === 'fall') {
      return value ? "text-red-500" : "text-emerald-500";
    } else if (type === 'bp') {
      return value !== "Normal" ? "text-yellow-500" : "text-emerald-500";
    }
    return "text-emerald-500";
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gradient-to-br from-slate-900 to-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'} transition-all duration-300`}>
      {/* Header */}
      <header className="bg-gradient-to-r from-violet-600 to-indigo-700 py-4 px-6 shadow-xl">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center">
            <Activity className="mr-2 text-emerald-300" size={28} /> 
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-emerald-300">
              IoT Health Monitoring System
            </span>
          </h1>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setDarkMode(!darkMode)} 
              className="p-2 rounded-full hover:bg-white/10 transition-all"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              <Moon size={20} className="text-white" />
            </button>
            <div className="relative">
              <button className="p-2 rounded-full hover:bg-white/10 transition-all">
                <Bell size={20} className="text-white" />
                {notificationCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </button>
            </div>
            <nav className="flex space-x-2">
              <button 
                className={`px-4 py-2 rounded-lg transition-all ${view === 'dashboard' 
                  ? 'bg-white/20 text-white shadow-lg' 
                  : 'hover:bg-white/10 text-white/80'}`}
                onClick={() => setView('dashboard')}
              >
                Dashboard
              </button>
              <button 
                className={`px-4 py-2 rounded-lg transition-all ${view === 'logs' 
                  ? 'bg-white/20 text-white shadow-lg' 
                  : 'hover:bg-white/10 text-white/80'}`}
                onClick={() => setView('logs')}
              >
                Logs
              </button>
              <button 
                className={`px-4 py-2 rounded-lg transition-all ${view === 'chat' 
                  ? 'bg-white/20 text-white shadow-lg' 
                  : 'hover:bg-white/10 text-white/80'}`}
                onClick={() => setView('chat')}
              >
                First Aid Chat
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto p-6">
        {view === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Patient Info Card */}
            <div className="col-span-12 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 rounded-xl shadow-xl overflow-hidden border border-indigo-700/30 p-6 flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
                  <User className="text-white" size={28} />
                </div>
                <div className="ml-4">
                  <h2 className={`font-bold text-xl ${darkMode ? 'text-white' : 'text-gray-800'}`}>Patient: John Doe</h2>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Age: 65 • ID: IOT-2025-001 • Last Check: {new Date().toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className={`px-3 py-1 rounded-full ${currentData.HeartRate < 60 || currentData.SpO2 < 95 || currentData.FallDetected ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'} text-sm font-medium`}>
                  {currentData.HeartRate < 60 || currentData.SpO2 < 95 || currentData.FallDetected ? 'Attention Required' : 'Status: Normal'}
                </div>
                <div className="flex items-center space-x-2">
                  <Battery className={`${currentData.HeartRate < 60 ? 'text-red-400' : 'text-emerald-400'}`} size={18} />
                  <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>92%</span>
                </div>
              </div>
            </div>

            {/* Row 1: Vitals Overview */}
            <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Heart Rate */}
              <div className={`${darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white'} rounded-xl shadow-xl overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'} relative group hover:shadow-2xl transition-all duration-300 hover:scale-105`}>
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-red-800/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="p-6 relative z-10">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center">
                      <div className="p-2 bg-red-500/20 rounded-lg mr-3">
                        <Heart className="text-red-500" size={24} />
                      </div>
                      <h2 className={`text-lg font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Heart Rate</h2>
                    </div>
                    <div className={`px-2 py-1 rounded-full ${
                      currentData.HeartRate < 60 || currentData.HeartRate > 100 
                        ? 'bg-red-500/20 text-red-500' 
                        : 'bg-emerald-500/20 text-emerald-500'
                    } text-xs font-semibold flex items-center`}>
                      <span className={`w-2 h-2 rounded-full mr-1 ${
                        currentData.HeartRate < 60 || currentData.HeartRate > 100 
                          ? 'bg-red-500' 
                          : 'bg-emerald-500'
                      }`}></span>
                      {currentData.HeartRate < 60 ? 'Low' : currentData.HeartRate > 100 ? 'High' : 'Normal'}
                    </div>
                  </div>
                  
                  <div className="flex items-baseline mt-6">
                    <h3 className={`text-4xl font-bold ${getStatusColorClass(currentData.HeartRate, 'heart')}`}>
                      {currentData.HeartRate}
                    </h3>
                    <span className={`ml-2 text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>BPM</span>
                  </div>
                  
                  <div className="mt-1">
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Normal range: 60-100 BPM</p>
                  </div>
                  
                  <div className="mt-4 h-16">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData.slice(-8)}>
                        <defs>
                          <linearGradient id="heartRateGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area 
                          type="monotone" 
                          dataKey="HeartRate" 
                          stroke="#ef4444" 
                          fill="url(#heartRateGradient)" 
                          strokeWidth={2}
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* SpO2 */}
              <div className={`${darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white'} rounded-xl shadow-xl overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'} relative group hover:shadow-2xl transition-all duration-300 hover:scale-105`}>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-800/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="p-6 relative z-10">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-500/20 rounded-lg mr-3">
                        <Droplets className="text-blue-500" size={24} />
                      </div>
                      <h2 className={`text-lg font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Blood Oxygen</h2>
                    </div>
                    <div className={`px-2 py-1 rounded-full ${
                      currentData.SpO2 < 95 
                        ? currentData.SpO2 < 90 
                          ? 'bg-red-500/20 text-red-500' 
                          : 'bg-yellow-500/20 text-yellow-500'
                        : 'bg-emerald-500/20 text-emerald-500'
                    } text-xs font-semibold flex items-center`}>
                      <span className={`w-2 h-2 rounded-full mr-1 ${
                        currentData.SpO2 < 95 
                          ? currentData.SpO2 < 90 
                            ? 'bg-red-500' 
                            : 'bg-yellow-500'
                          : 'bg-emerald-500'
                      }`}></span>
                      {currentData.SpO2 < 90 ? 'Critical' : currentData.SpO2 < 95 ? 'Low' : 'Normal'}
                    </div>
                  </div>
                  
                  <div className="flex items-baseline mt-6">
                    <h3 className={`text-4xl font-bold ${getStatusColorClass(currentData.SpO2, 'spo2')}`}>
                      {currentData.SpO2}
                    </h3>
                    <span className={`ml-2 text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>%</span>
                  </div>
                  
                  <div className="mt-1">
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Normal range: 95-100%</p>
                  </div>
                  
                  <div className="mt-4 h-16">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData.slice(-8)}>
                        <defs>
                          <linearGradient id="spo2Gradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area 
                          type="monotone" 
                          dataKey="SpO2" 
                          stroke="#3b82f6" 
                          fill="url(#spo2Gradient)" 
                          strokeWidth={2}
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Temperature */}
              <div className={`${darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white'} rounded-xl shadow-xl overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'} relative group hover:shadow-2xl transition-all duration-300 hover:scale-105`}>
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-800/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="p-6 relative z-10">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center">
                      <div className="p-2 bg-orange-500/20 rounded-lg mr-3">
                        <Thermometer className="text-orange-500" size={24} />
                      </div>
                      <h2 className={`text-lg font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Temperature</h2>
                    </div>
                    <div className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-500 text-xs font-semibold flex items-center">
                      <span className="w-2 h-2 rounded-full mr-1 bg-emerald-500"></span>
                      Normal
                    </div>
                  </div>
                  
                  <div className="flex items-baseline mt-6">
                    <h3 className="text-4xl font-bold text-orange-500">
                      36.7
                    </h3>
                    <span className={`ml-2 text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>°C</span>
                  </div>
                  
                  <div className="mt-1">
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Normal range: 36.1-37.2°C</p>
                  </div>
                  
                  <div className="mt-4 h-16">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[
                        {time: '2:30', temp: 36.7},
                        {time: '2:31', temp: 36.7},
                        {time: '2:32', temp: 36.8},
                        {time: '2:33', temp: 36.7},
                        {time: '2:34', temp: 36.6},
                        {time: '2:35', temp: 36.7},
                        {time: '2:36', temp: 36.8},
                        {time: '2:37', temp: 36.7}
                      ]}>
                        <defs>
                          <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area 
                          type="monotone" 
                          dataKey="temp" 
                          stroke="#f97316" 
                          fill="url(#tempGradient)" 
                          strokeWidth={2}
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Fall Detection */}
              <div className={`${darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white'} rounded-xl shadow-xl overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'} relative group hover:shadow-2xl transition-all duration-300 hover:scale-105`}>
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-800/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="p-6 relative z-10">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-500/20 rounded-lg mr-3">
                        <AlertTriangle className="text-purple-500" size={24} />
                      </div>
                      <h2 className={`text-lg font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Fall Detection</h2>
                    </div>
                    <div className={`px-2 py-1 rounded-full ${
                      currentData.FallDetected 
                        ? 'bg-red-500/20 text-red-500' 
                        : 'bg-emerald-500/20 text-emerald-500'
                    } text-xs font-semibold flex items-center`}>
                      <span className={`w-2 h-2 rounded-full mr-1 ${
                        currentData.FallDetected ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
                      }`}></span>
                      {currentData.FallDetected ? 'Detected' : 'Clear'}
                    </div>
                  </div>
                  
                  <div className="flex items-baseline mt-6">
                    <h3 className={`text-4xl font-bold ${getStatusColorClass(currentData.FallDetected, 'fall')}`}>
                      {currentData.FallDetected ? 'Fall Detected!' : 'No Fall'}
                    </h3>
                  </div>
                  
                  <div className="mt-1">
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {currentData.FallDetected ? 'Assistance may be required' : 'Patient is stable'}
                    </p>
                  </div>
                  
                  <div className="mt-4 h-16 flex items-center justify-center">
                    {currentData.FallDetected ? (
                      <div className="animate-pulse flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-red-500 rounded-full animation-delay-200"></div>
                        <div className="w-3 h-3 bg-red-500 rounded-full animation-delay-400"></div>
                      </div>
                    ) : (
                      <div className="text-2xl font-semibold flex items-center">
                        <Shield className={`mr-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-500'}`} size={24} />
                        <span className={darkMode ? 'text-emerald-400' : 'text-emerald-500'}>Safe</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Charts - Row 2 */}
            <div className="col-span-12 lg:col-span-8 overflow-hidden">
              <div className={`${darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white'} rounded-xl shadow-xl overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-6`}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Health Metrics Over Time
                  </h2>
                  <div className="flex space-x-2">
                    <button className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${darkMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}>
                      Last Hour
                    </button>
                    <button className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                      Today
                    </button>
                    <button className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                      Week
                    </button>
                  </div>
                </div>
                
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                      <XAxis 
                        dataKey="time" 
                        stroke={darkMode ? '#9ca3af' : '#6b7280'} 
                        tick={{fill: darkMode ? '#9ca3af' : '#6b7280'}}
                      />
                      <YAxis 
                        yAxisId="left" 
                        stroke={darkMode ? '#9ca3af' : '#6b7280'} 
                        tick={{fill: darkMode ? '#9ca3af' : '#6b7280'}}
                        domain={[40, 120]} 
                        label={{ 
                          value: 'Heart Rate (BPM)', 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { textAnchor: 'middle', fill: darkMode ? '#9ca3af' : '#6b7280' } 
                        }} 
                      />
                      <YAxis 
                        yAxisId="right" 
                        orientation="right" 
                        stroke={darkMode ? '#9ca3af' : '#6b7280'} 
                        tick={{fill: darkMode ? '#9ca3af' : '#6b7280'}}
                        domain={[85, 100]} 
                        label={{ 
                          value: 'SpO2 (%)', 
                          angle: 90, 
                          position: 'insideRight',
                          style: { textAnchor: 'middle', fill: darkMode ? '#9ca3af' : '#6b7280' } 
                        }} 
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                          borderColor: darkMode ? '#4b5563' : '#e5e7eb',
                          color: darkMode ? '#f9fafb' : '#111827'
                        }} 
                      />
                      <Legend />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="HeartRate" 
                        name="Heart Rate" 
                        stroke="#ef4444" 
                        activeDot={{ r: 6, fill: '#ef4444', stroke: '#fecaca', strokeWidth: 2 }} 
                        strokeWidth={2}
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="SpO2" 
                        name="Blood Oxygen" 
                        stroke="#3b82f6" 
                        activeDot={{ r: 6, fill: '#3b82f6', stroke: '#bfdbfe', strokeWidth: 2 }} 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            {/* Status and Alerting - Row 2 Right Column */}
            <div className="col-span-12 lg:col-span-4 grid grid-cols-1 gap-6">
              {/* Status Card */}
              <div className={`${darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white'} rounded-xl shadow-xl overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-6`}>
                <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Health Status
                </h2>
                
                <div className="space-y-4">
                  {/* BP Status */}
                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-100'} flex items-center justify-between`}>
                    <div className="flex items-center">
                      <Activity className={getStatusColorClass(0, 'bp')} size={20} />
                      <span className={`ml-2 font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Blood Pressure</span>
                    </div>
                    <div className={`px-3 py-1 rounded-full ${getStatusColorClass(currentData.BPWarning === "Normal" ? 1 : 0, 'bp')} bg-opacity-20 text-xs font-medium`}>
                      {currentData.BPWarning}
                    </div>
                  </div>
                  
                  {/* Last Fall */}
                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-100'} flex items-center justify-between`}>
                    <div className="flex items-center">
                      <AlertTriangle className={getStatusColorClass(currentData.FallDetected, 'fall')} size={20} />
                      <span className={`ml-2 font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Fall Status</span>
                    </div>
                    <div className={`px-3 py-1 rounded-full ${getStatusColorClass(currentData.FallDetected, 'fall')} bg-opacity-20 text-xs font-medium`}>
                      {currentData.FallWarning}
                    </div>
                  </div>
                  
                  {/* Last Updated */}
                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-100'} flex items-center justify-between`}>
                    <div className="flex items-center">
                      <Clock className={`${darkMode ? 'text-blue-400' : 'text-blue-500'}`} size={20} />
                      <span className={`ml-2 font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Last Updated</span>
                    </div>
                    <div className={`px-3 py-1 rounded-full ${darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'} text-xs font-medium`}>
                      {new Date(currentData.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Alert History */}
              <div className={`${darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white'} rounded-xl shadow-xl overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-6`}>
                <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Recent Alerts
                </h2>
                
                <div className="space-y-3">
                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-red-500/10' : 'bg-red-50'} border ${darkMode ? 'border-red-500/20' : 'border-red-100'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-start">
                        <Heart className="text-red-500 mt-0.5" size={16} />
                        <div className="ml-2">
                          <h3 className={`font-medium ${darkMode ? 'text-red-400' : 'text-red-700'}`}>Low Heart Rate</h3>
                          <p className={`text-xs ${darkMode ? 'text-red-300' : 'text-red-600'}`}>Heart rate dropped to 54 BPM</p>
                        </div>
                      </div>
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        2:31 PM
                      </span>
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-blue-500/10' : 'bg-blue-50'} border ${darkMode ? 'border-blue-500/20' : 'border-blue-100'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-start">
                        <Droplets className="text-blue-500 mt-0.5" size={16} />
                        <div className="ml-2">
                          <h3 className={`font-medium ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>SpO2 Alert</h3>
                          <p className={`text-xs ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>SpO2 dipped to 97% (Normal)</p>
                        </div>
                      </div>
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        2:30 PM
                      </span>
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-yellow-500/10' : 'bg-yellow-50'} border ${darkMode ? 'border-yellow-500/20' : 'border-yellow-100'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-start">
                        <Battery className="text-yellow-500 mt-0.5" size={16} />
                        <div className="ml-2">
                          <h3 className={`font-medium ${darkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>Battery Alert</h3>
                          <p className={`text-xs ${darkMode ? 'text-yellow-300' : 'text-yellow-600'}`}>Device battery at 23%</p>
                        </div>
                      </div>
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        1:45 PM
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'logs' && (
          <div className="grid grid-cols-1 gap-6">
            {/* Logs Header */}
            <div className={`${darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white'} rounded-xl shadow-xl overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-6`}>
              <div className="flex justify-between items-center">
                <div>
                  <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Health Data Logs
                  </h2>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Showing {historicalData.length} recent records
                  </p>
                </div>
                <button 
                  onClick={downloadCSV}
                  className={`flex items-center px-4 py-2 rounded-lg transition-all ${
                    darkMode 
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                      : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700'
                  }`}
                >
                  <Download size={18} className="mr-2" />
                  Download CSV
                </button>
              </div>
            </div>
            
            {/* Logs Table */}
            <div className={`${darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white'} rounded-xl shadow-xl overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className={darkMode ? 'bg-gray-700/30' : 'bg-gray-50'}>
                    <tr>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Timestamp
                      </th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Heart Rate
                      </th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        SpO2
                      </th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        BP Status
                      </th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Fall Detected
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`${darkMode ? 'divide-y divide-gray-700' : 'divide-y divide-gray-200'}`}>
                    {historicalData.map((log, index) => (
                      <tr key={log.id || index} className={index % 2 === 0 ? (darkMode ? 'bg-gray-800/30' : 'bg-white') : (darkMode ? 'bg-gray-800/60' : 'bg-gray-50')}>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getStatusColorClass(log.HeartRate, 'heart')}`}>
                          {log.HeartRate} BPM
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getStatusColorClass(log.SpO2, 'spo2')}`}>
                          {log.SpO2}%
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getStatusColorClass(log.BPWarning === "Normal" ? 1 : 0, 'bp')}`}>
                          {log.BPWarning}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${log.FallDetected ? 'text-red-500 font-medium' : 'text-green-500'}`}>
                          {log.FallDetected ? 'Yes ⚠️' : 'No'}
                        </td>
                      </tr>
                    ))}
                    
                    {historicalData.length === 0 && (
                      <tr>
                        <td colSpan="5" className={`px-6 py-4 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          No data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {view === 'chat' && (
          <div className="grid grid-cols-1 gap-6">
            {/* Chat Interface */}
            <div className={`${darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white'} rounded-xl shadow-xl overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-6 flex flex-col h-[80vh]`}>
              <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'} mb-4`}>
                First Aid Assistant
              </h2>
              
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto mb-4 pr-2 space-y-4">
                {chatMessages.map((message, index) => (
                  <div 
                    key={index} 
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.sender === 'user' 
                          ? darkMode 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-indigo-100 text-indigo-900'
                          : darkMode 
                            ? 'bg-gray-700 text-white' 
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {message.text}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Chat Input */}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                  placeholder="Ask about first aid..."
                  className={`flex-1 px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white focus:ring-indigo-500' 
                      : 'bg-white border-gray-300 text-gray-800 focus:ring-indigo-500'
                  }`}
                />
                <button
                  onClick={handleChatSubmit}
                  className={`p-3 rounded-xl ${
                    darkMode 
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                      : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700'
                  }`}
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`py-4 px-6 ${darkMode ? 'bg-gray-900 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
        <div className="container mx-auto flex justify-between items-center">
          <p className="text-sm">© 2025 IoT Health Monitoring System</p>
          <div className="flex items-center space-x-4 text-sm">
            <a href="#" className="hover:underline">Privacy Policy</a>
            <a href="#" className="hover:underline">Terms of Service</a>
            <a href="#" className="hover:underline">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}