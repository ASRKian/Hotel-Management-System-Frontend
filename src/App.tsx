import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
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
import { ToastContainer } from 'react-toastify';
import PropertyManagement from "./pages/PropertyManagement.tsx";
import { LogoSpinner } from "./components/Spinner.tsx";
import StaffManagement from "./pages/StaffManagment.tsx";
import { useAuthBootstrap } from "./hooks/useAuthBootstrap.ts";
import RoomsByFloor from "./pages/RoomsByFloor.tsx";
import PackageManagement from "./pages/PackageManagement.tsx";
import BookingsManagement from "./pages/BookingManagement.tsx";
// import GuestsCreationManagement from "./pages/GuestsCreationManagement.tsx";
// import GuestsManagement from "./pages/GuestManagement.tsx";
import "react-datepicker/dist/react-datepicker.css";
import PaymentsManagement from "./pages/PaymentManagement.tsx";
import RoomTypeBasePriceManagement from "./pages/RoomTypeBasePriceManagement.tsx";
import { useAutoLogout } from "./hooks/useAutoLogout.ts";
import { useAppDispatch, useAppSelector } from "./redux/hook.ts";
import { setApiLoaded } from "./redux/slices/isLoggedInSlice.ts";
import RoomStatusBoard from "./pages/RoomStatusBoard.tsx";
import VendorsManagement from "./pages/VendorsManagement.tsx";
import LaundryPricingManagement from "./pages/LaundryPricingManagement.tsx";
import LaundryOrdersManagement from "./pages/LaundryOrdersManagement.tsx";
import CreateEnquiry from "./pages/EnquiryCreate.tsx";
import EnquiriesManagement from "./pages/EnquiriesManagement.tsx";

async function login() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "superadmin@atithiflow.com",
    password: "ChangeMe@123"
    // email: "newuser@email.com",
    // password: "1234"
  });

  if (error) {
    console.error(error.message);
    return;
  }

  // console.log("User:", data.user);
  // console.log("Access token:", data.session.access_token);

}

const queryClient = new QueryClient();

const App = () => {

  useAuthBootstrap()
  useAutoLogout()
  const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
  const apiLoaded = useAppSelector(state => state.isLoggedIn.apiLoaded)
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (apiLoaded && !isLoggedIn) {
      navigate("/login", { replace: true })
      dispatch(setApiLoaded(false))
    }
  }, [isLoggedIn, apiLoaded])

  // useEffect(() => { login() }, [])
  return (
    <QueryClientProvider client={queryClient}>
      <ToastContainer />
      <TooltipProvider>
        <Toaster />
        <Sonner />
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
          <Route path="/rooms" element={<RoomsByFloor />} />
          <Route path="/plans" element={<PackageManagement />} />
          <Route path="/bookings" element={<BookingsManagement />} />
          {/* <Route path="/booking-guests" element={<GuestsCreationManagement />} /> */}
          {/* <Route path="/guests" element={<GuestsManagement />} /> */}
          <Route path="/payments" element={<PaymentsManagement />} />
          <Route path="/room-categories" element={<RoomTypeBasePriceManagement />} />
          <Route path="/room-status" element={<RoomStatusBoard />} />
          <Route path="/vendors" element={<VendorsManagement />} />
          <Route path="/laundry-pricing" element={<LaundryPricingManagement />} />
          <Route path="/laundry-orders" element={<LaundryOrdersManagement />} />
          <Route path="/create-enquiry" element={<CreateEnquiry />} />
          <Route path="/enquiries" element={<EnquiriesManagement />} />
          <Route path="/spinner" element={<LogoSpinner />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </QueryClientProvider>
  )
};

export default App;
