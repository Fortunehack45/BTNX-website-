import { ThemeProvider } from "../../src/context/ThemeContext";
import AdminPortal from "../../src/pages/AdminPortal";

export default function App() {
  return (
    <ThemeProvider>
      <AdminPortal />
    </ThemeProvider>
  );
}
