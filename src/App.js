import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import StandardPortfolio from "./components/StandardPortfolio";

function App() {
  return (
    <Routes>
      <Route path="/" element={<StandardPortfolio />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
