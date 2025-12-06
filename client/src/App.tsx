import { Navigate, Route, Routes } from "react-router-dom";
import LandingForestPage from "./pages/LandingForestPage";
import BarcodeScanPage from "./pages/BarcodeScanPage";
import BarcodeCapturePage from "./pages/BarcodeCapturePage";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/landing-forest" replace />} />
      <Route path="/landing-forest" element={<LandingForestPage />} />
      <Route path="/barcode" element={<BarcodeCapturePage />} />
      <Route path="/barcode-scan" element={<BarcodeScanPage />} />
      <Route path="*" element={<Navigate to="/landing-forest" replace />} />
    </Routes>
  );
};

export default App;
