import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./screens/Dashboard";
import Downloads from "./screens/Downloads";
import Logs from "./screens/Logs";
import Settings from "./screens/Settings";

function App() {
  const [activeScreen, setActiveScreen] = useState("dashboard");

  const renderScreen = () => {
    switch (activeScreen) {
      case "dashboard":
        return <Dashboard />;
      case "downloads":
        return <Downloads />;
      case "logs":
        return <Logs />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar activeScreen={activeScreen} setActiveScreen={setActiveScreen} />
      <div className="flex-1 overflow-auto">{renderScreen()}</div>
    </div>
  );
}

export default App;
