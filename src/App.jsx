import AppShell from './app/pages/AppShell.jsx';
import AppRoutes from './app/routes/AppRoutes.jsx';
import './app/pages/GlobalBlueTheme.css';


export default function App() {
  return (
    <AppShell>
      <AppRoutes />
    </AppShell>
  );
}

