import "@/App.css";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import ApiVerificationTool from "@/components/ApiVerificationTool";
import { Lightning, House } from "@phosphor-icons/react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center" data-testid="landing-page">
      <div className="text-center space-y-6">
        <div className="flex items-center justify-center gap-3">
          <Lightning size={32} weight="bold" className="text-[#FAFAFA]" />
          <h1 className="text-2xl font-semibold text-[#FAFAFA] tracking-tight" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
            Central Inventory
          </h1>
        </div>
        <p className="text-sm text-[#A1A1AA]" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
          MyGenie POS — Inventory Management Module
        </p>
        <Link
          to="/verify"
          className="inline-flex items-center gap-2 bg-[#FAFAFA] text-[#000] px-6 py-2.5 text-sm font-semibold hover:bg-[#E4E4E7] transition-colors duration-75"
          style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
          data-testid="go-to-api-verify-btn"
        >
          <Lightning size={16} weight="bold" />
          Open API Verification Console
        </Link>
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/verify" element={<ApiVerificationTool />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
