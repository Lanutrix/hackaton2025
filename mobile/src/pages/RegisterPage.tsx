import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register, loginApi } from "../api";
import { useAuth } from "../context/AuthContext";

const RegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Register user
      await register({ username, password });
      // Auto-login after registration
      const token = await loginApi({ username, password });
      await login(token);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#f6f8f6]">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-[#102215]">Create account</h1>
          <p className="text-muted text-sm mt-2">Get started with a free account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-1.5 text-[#102215]">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={50}
              placeholder="your_username"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:border-[#13ec49] focus:ring-1 focus:ring-[#13ec49] transition-colors"
            />
            <p className="text-xs text-muted mt-1">3-50 characters</p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1.5 text-[#102215]">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              maxLength={100}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:border-[#13ec49] focus:ring-1 focus:ring-[#13ec49] transition-colors"
            />
            <p className="text-xs text-muted mt-1">At least 6 characters</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#13ec49] text-[#102215] py-2.5 rounded-lg text-sm font-semibold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-[#13ec49] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
