import { Navigate, Route, Routes } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import LandingForestPage from "./pages/LandingForestPage";
import LandingFieldPage from "./pages/LandingFieldPage";
import SearchPage from "./pages/SearchPage";
import BarcodeScanPage from "./pages/BarcodeScanPage";
import GlassBottlePage from "./pages/GlassBottlePage";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/landing-forest" replace />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/landing-forest" element={<LandingForestPage />} />
      <Route path="/landing-field" element={<LandingFieldPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/barcode-scan" element={<BarcodeScanPage />} />
      <Route path="/glass-bottle" element={<GlassBottlePage />} />
      <Route path="*" element={<Navigate to="/landing-forest" replace />} />
    </Routes>
  );
};

export default App;
