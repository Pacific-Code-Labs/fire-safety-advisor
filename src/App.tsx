import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner, TooltipProvider } from "@pacific-code-labs/fire-code-design-system";
import { Toaster } from "@/components/ui/toaster";
import Index from "./pages/Index.tsx";
import Landing from "./pages/Landing.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import VerifyEmail from "./pages/VerifyEmail.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import RolesPage from "./pages/RolesPage.tsx";
import NewOrganization from "./pages/NewOrganization.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Projects from "./pages/Projects.tsx";
import NewProject from "./pages/NewProject.tsx";
import ProjectDetail from "./pages/ProjectDetail.tsx";
import ElectricalProject from "./pages/ElectricalProject.tsx";
import Pricing from "./pages/Pricing.tsx";
import NotFound from "./pages/NotFound.tsx";
import { LangProvider } from "@/contexts/LangContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { BillingProvider } from "@/contexts/BillingContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AssistantProvider } from "@/contexts/AssistantContext";
import { RequireAuth } from "@/components/RequireAuth";
import Evaluator from "./pages/Evaluator.tsx";

// The admin CMS lives in the separate private `fire-code-admin` app/repo
// (landing-dxp-builder, delivery variant B). This public site contains ZERO
// admin code and never registers an `/admin` route.

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <BillingProvider>
        <LangProvider>
          <AssistantProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/demo" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
                <Route path="/dashboard/evaluator" element={<RequireAuth><Evaluator /></RequireAuth>} />
                <Route path="/dashboard/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
                <Route path="/dashboard/roles" element={<RequireAuth><RolesPage /></RequireAuth>} />
                <Route path="/organizations/new" element={<RequireAuth><NewOrganization /></RequireAuth>} />
                <Route path="/projects" element={<RequireAuth><Projects /></RequireAuth>} />
                <Route path="/projects/new" element={<RequireAuth><NewProject /></RequireAuth>} />
                <Route path="/projects/electrical" element={<RequireAuth><ElectricalProject /></RequireAuth>} />
                <Route path="/projects/:id" element={<RequireAuth><ProjectDetail /></RequireAuth>} />
                <Route path="/pricing" element={<Pricing />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
          </AssistantProvider>
        </LangProvider>
        </BillingProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
