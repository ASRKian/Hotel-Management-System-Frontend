import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Platform from "./pages/Platform";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";
import Reservation from "./pages/Reservation";
import { supabase } from "../supabase/functions/supabase-client.ts";
import { useEffect } from "react";
import RoleManagement from "./pages/RoleManagement.tsx";
import { Provider } from 'react-redux'
import { store } from "./redux/store.ts";
import { ToastContainer } from 'react-toastify';
import PropertyManagement from "./pages/PropertyManagement.tsx";
import { LogoSpinner } from "./components/Spinner.tsx";
import StaffManagement from "./pages/StaffManagment.tsx";

async function login() {
  const { data, error } = await supabase.auth.signInWithPassword({
    // email: "superadmin@atithiflow.com",
    // password: "ChangeMe@123"
    email: "dummy1@email.com",
    password: "1234"
  });

  if (error) {
    console.error(error.message);
    return;
  }

  console.log("User:", data.user);
  console.log("Access token:", data.session.access_token);

}

const queryClient = new QueryClient();

const App = () => {

  useEffect(() => { login() }, [])
  return (
    <Provider store={store}>
      <ToastContainer/>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/platform" element={<Platform />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/reservation" element={<Reservation />} />
              <Route path="/roles" element={<RoleManagement />} />
              <Route path="/properties" element={<PropertyManagement />} />
              <Route path="/staff" element={<StaffManagement />} />
              <Route path="/spinner" element={<LogoSpinner />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </Provider>
  )
};

export default App;
