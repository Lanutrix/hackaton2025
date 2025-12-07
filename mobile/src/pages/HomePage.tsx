import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const HomePage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#f6f8f6]">
      <div className="text-center animate-fade-in">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-4 text-[#102215]">
          Hello, <span className="text-[#13ec49]">world</span>!?
        </h1>
        
        {user && (
          <p className="text-muted text-lg mb-8 animate-fade-in animate-delay-100">
            Welcome back, <span className="font-semibold text-[#13ec49]">{user.username}</span>
          </p>
        )}

        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#13ec49] transition-colors animate-fade-in animate-delay-200"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign out
        </button>
      </div>
    </div>
  );
};

export default HomePage;
