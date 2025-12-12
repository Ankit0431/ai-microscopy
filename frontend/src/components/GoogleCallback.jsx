import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import useToast from '../hooks/useToast.js';
import { getConfig } from '../config/config.js';

const config = getConfig();

const GoogleCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');

  useEffect(() => {
    const handleGoogleCallback = async () => {
      try {
        setIsProcessing(true);
        setError('');

        const userParam = searchParams.get('user');
        if (!userParam) {
          setError('No user information received from Google');
          return;
        }

        let parsedUserInfo;
        try {
          parsedUserInfo = JSON.parse(decodeURIComponent(userParam));
        } catch (parseError) {
          setError('Invalid user information format');
          return;
        }

        console.log('Parsed user info:', parsedUserInfo);
        console.log('User has role:', !!parsedUserInfo.role, 'Role value:', parsedUserInfo.role);

        if (parsedUserInfo.role) {
          console.log('User has role, proceeding with token request for userId:', parsedUserInfo.id);
          const tokenResponse = await fetch(config.GOOGLE_TOKEN_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              userId: parsedUserInfo.id
            }),
          });

          console.log('Token response status:', tokenResponse.status);
          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            console.log('Token response data:', tokenData);
            if (tokenData.success) {
              localStorage.setItem('token', tokenData.data.token);
              localStorage.setItem('user', JSON.stringify(tokenData.data.user));
              window.dispatchEvent(new CustomEvent('authStateChanged'));
              
              toast.success('Successfully signed in!');
              
              if (tokenData.data.user.role === 'doctor') {
                navigate('/doctor-dashboard');
              } else {
                navigate('/patient-dashboard');
              }
              return;
            } else {
              console.error('Token request failed:', tokenData);
              setError(tokenData.message || 'Failed to authenticate');
              return;
            }
          } else {
            const errorData = await tokenResponse.json();
            console.error('Token request HTTP error:', errorData);
            setError(errorData.message || 'Failed to authenticate');
            return;
          }
        }

        console.log('User does not have role, showing role selection');
        
        setUserInfo(parsedUserInfo);
        setShowRoleSelection(true);
        setIsProcessing(false);
      } catch (error) {
        console.error('Google callback error:', error);
        setError('Network error. Please try again.');
        setIsProcessing(false);
      }
    };

    handleGoogleCallback();
  }, [searchParams, navigate, toast]);

  const handleRoleSelection = async () => {
    if (!selectedRole) {
      toast.error('Please select a role');
      return;
    }

    try {
      setIsProcessing(true);
      
      const completeResponse = await fetch(config.GOOGLE_COMPLETE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: userInfo.id,
          role: selectedRole
        }),
      });

      if (completeResponse.ok) {
        const completeData = await completeResponse.json();
        if (completeData.success) {
          localStorage.setItem('token', completeData.data.token);
          localStorage.setItem('user', JSON.stringify(completeData.data.user));
          window.dispatchEvent(new CustomEvent('authStateChanged'));
          
          toast.success('Account setup completed successfully!');
          
          if (completeData.data.user.role === 'doctor') {
            navigate('/doctor-dashboard');
          } else {
            navigate('/patient-dashboard');
          }
        } else {
          setError(completeData.message || 'Failed to complete signup');
        }
      } else {
        const errorData = await completeResponse.json();
        setError(errorData.message || 'Failed to complete signup');
      }
    } catch (error) {
      console.error('Role selection error:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (showRoleSelection) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white font-sans flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#15151f]/80 backdrop-blur-lg border border-red-900/50 rounded-2xl shadow-lg p-8 w-full max-w-md mx-4"
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600 mb-2">
              Complete Your Setup
            </h2>
            <p className="text-gray-400 text-sm">
              Welcome, {userInfo?.fullName}! Please select your account type to continue.
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div 
              onClick={() => setSelectedRole('patient')}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                selectedRole === 'patient' 
                  ? 'border-red-500 bg-red-500/10' 
                  : 'border-red-800/40 hover:border-red-600/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  selectedRole === 'patient' ? 'border-red-500 bg-red-500' : 'border-gray-400'
                }`} />
                <div>
                  <h3 className="font-semibold text-white">Patient</h3>
                  <p className="text-sm text-gray-400">Access medical services and manage your health records</p>
                </div>
              </div>
            </div>

            <div 
              onClick={() => setSelectedRole('doctor')}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                selectedRole === 'doctor' 
                  ? 'border-red-500 bg-red-500/10' 
                  : 'border-red-800/40 hover:border-red-600/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  selectedRole === 'doctor' ? 'border-red-500 bg-red-500' : 'border-gray-400'
                }`} />
                <div>
                  <h3 className="font-semibold text-white">Doctor</h3>
                  <p className="text-sm text-gray-400">Provide medical services and manage patient records</p>
                </div>
              </div>
            </div>
          </div>

          <motion.button
            onClick={handleRoleSelection}
            disabled={!selectedRole || isProcessing}
            whileHover={{
              scale: (!selectedRole || isProcessing) ? 1 : 1.02,
              boxShadow: (!selectedRole || isProcessing) ? "none" : "0 0 30px rgba(255, 27, 27, 0.4)",
            }}
            whileTap={{ scale: (!selectedRole || isProcessing) ? 1 : 0.98 }}
            className={`w-full py-3 rounded-lg font-semibold shadow-lg transition-all duration-300 ${
              !selectedRole || isProcessing
                ? 'bg-gray-600 cursor-not-allowed' 
                : 'bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900'
            }`}
          >
            {isProcessing ? 'Setting up...' : 'Continue'}
          </motion.button>

          <button
            onClick={() => navigate('/login')}
            className="w-full mt-4 text-gray-400 hover:text-white transition-colors text-sm"
          >
            Back to Login
          </button>
        </motion.div>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white font-sans flex items-center justify-center">
        <div className="text-center">
          <motion.div
            className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <h2 className="text-xl font-semibold mb-2">Processing Google Sign-in...</h2>
          <p className="text-gray-400">Please wait while we complete your authentication.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white font-sans flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Authentication Error</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans flex items-center justify-center">
      <div className="text-center">
        <motion.div
          className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full mx-auto mb-4"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <h2 className="text-xl font-semibold mb-2">Processing...</h2>
        <p className="text-gray-400">Please wait...</p>
      </div>
    </div>
  );
};

export default GoogleCallback; 