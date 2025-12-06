import { Navigate, Route, Routes } from "react-router-dom";
import LandingForestPage from "./pages/LandingForestPage";
import BarcodeScanPage from "./pages/BarcodeScanPage";
import BarcodeCapturePage from "./pages/BarcodeCapturePage";
import SortingQuizPage from "./pages/SortingQuizPage";
import WasteCategoriesPage from "./pages/WasteCategoriesPage";
import AuthPage from "./pages/AuthPage";
import RecognitionChoicePage from "./pages/RecognitionChoicePage";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/landing-forest" replace />} />
      <Route path="/landing-forest" element={<LandingForestPage />} />
      <Route path="/barcode" element={<BarcodeCapturePage />} />
      <Route path="/barcode-scan" element={<BarcodeScanPage />} />
      <Route path="/sorting-quiz" element={<SortingQuizPage />} />
      <Route path="/waste-categories" element={<WasteCategoriesPage />} />
      <Route path="/recognition-choice" element={<RecognitionChoicePage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="*" element={<Navigate to="/landing-forest" replace />} />
    </Routes>
  );
};

export default App;
