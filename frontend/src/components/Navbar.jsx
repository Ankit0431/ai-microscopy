import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import authService from "../services/authService";
import useToast from "../hooks/useToast";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    authService.init();

    const checkAuth = () => {
      const authenticated = authService.isAuthenticated();
      setIsAuthenticated(authenticated);
      if (authenticated) {
        setUser(authService.getUser());
      }
    };

    checkAuth();

    const handleStorageChange = () => {
      checkAuth();
    };

    const handleAuthStateChange = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', checkAuth);
    window.addEventListener('authStateChanged', handleAuthStateChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', checkAuth);
      window.removeEventListener('authStateChanged', handleAuthStateChange);
    };
  }, []);

  const handleLogin = () => {
    navigate("/login");
  };

  const handleSignup = () => {
    navigate("/signup");
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
    navigate("/");
    toast.success("Logged out successfully!");
  };

  const handleDashboard = () => {
    if (user && user.role === 'doctor') {
      navigate("/doctor-dashboard");
    } else if (user && user.role === 'patient') {
      navigate("/patient-dashboard");
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-md border-b border-red-900/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center"
          >
            <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
              AI Microscopy
            </span>
          </motion.div>

          <div className="hidden md:flex items-center space-x-8 absolute left-1/2 transform -translate-x-1/2">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Link
                to="/"
                className="text-red-200 hover:text-red-400 transition-colors duration-200 font-medium"
              >
                Home
              </Link>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Link
                to="/about"
                className="text-red-200 hover:text-red-400 transition-colors duration-200 font-medium"
              >
                About
              </Link>
            </motion.div>
            {isAuthenticated && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <button
                  onClick={handleDashboard}
                  className="text-red-200 hover:text-red-400 transition-colors duration-200 font-medium"
                >
                  Dashboard
                </button>
              </motion.div>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="hidden md:flex items-center space-x-4"
          >
            {!isAuthenticated ? (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 text-red-200 hover:text-red-400 transition-colors duration-200 font-medium"
                  onClick={handleLogin}
                >
                  Login
                </motion.button>
                <motion.button
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0 0 20px rgba(255, 27, 27, 0.3)",
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                  onClick={handleSignup}
                >
                  Sign Up
                </motion.button>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white font-semibold text-sm">
                    {user&&(
                      user?.fullName?.charAt(0) || 'U'
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-red-200 font-medium">{user?.fullName}</p>
                    <p className="text-xs text-red-300 capitalize">{user?.role}</p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 text-red-200 hover:text-red-400 transition-colors duration-200 font-medium"
                  onClick={handleLogout}
                >
                  Logout
                </motion.button>
              </div>
            )}
          </motion.div>

          <div className="md:hidden">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-red-200 hover:text-red-400 transition-colors duration-200"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </motion.button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{
            opacity: isMenuOpen ? 1 : 0,
            height: isMenuOpen ? "auto" : 0,
          }}
          transition={{ duration: 0.3 }}
          className="md:hidden overflow-hidden"
        >
          <div className="py-4 space-y-4 border-t border-red-900/20">
            <Link
              to="/"
              className="block text-red-200 hover:text-red-400 transition-colors duration-200 font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            {isAuthenticated && (
              <button
                onClick={() => {
                  handleDashboard();
                  setIsMenuOpen(false);
                }}
                className="block w-full text-left text-red-200 hover:text-red-400 transition-colors duration-200 font-medium"
              >
                Dashboard
              </button>
            )}
            <Link
              to="/about"
              className="block text-red-200 hover:text-red-400 transition-colors duration-200 font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </Link>
            <div className="pt-4 space-y-3 border-t border-red-900/20">
              {!isAuthenticated ? (
                <>
                  <button
                    className="block w-full text-left text-red-200 hover:text-red-400 transition-colors duration-200 font-medium"
                    onClick={handleLogin}
                  >
                    Login
                  </button>
                  <button
                    className="block w-full px-6 py-2 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg font-medium shadow-lg text-center"
                    onClick={handleSignup}
                  >
                    Sign Up
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-red-900/20 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white font-semibold text-sm">
                    {user&&(
                      user?.fullName?.charAt(0) || 'U'
                    )}
                  </div>
                    <div>
                      <p className="text-sm text-red-200 font-medium">{user?.fullName}</p>
                      <p className="text-xs text-red-300 capitalize">{user?.role}</p>
                    </div>
                  </div>
                  <button
                    className="block w-full px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-lg text-center transition-colors duration-200"
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </nav>
  );
};

export default Navbar;
