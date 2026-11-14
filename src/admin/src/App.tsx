import { ThemeProvider } from "../../context/ThemeContext";
import AdminPortal from "../../pages/AdminPortal";

export default function App() {
  return (
    <ThemeProvider>
      <AdminPortal />
    </ThemeProvider>
  );
}
