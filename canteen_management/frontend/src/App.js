import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import UserPage from "./pages/UserPage";
import CanteenPage from "./pages/CanteenPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UserPage />} />
        <Route path="/canteen" element={<CanteenPage />} />
      </Routes>
    </BrowserRouter>
  );
}
