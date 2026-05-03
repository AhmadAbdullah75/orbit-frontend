import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { verifyEmailAPI } from '../features/auth/authAPI';

const VerifyEmailPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    let timeoutId;
    
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setMessage('No verification token provided.');
        return;
      }

      try {
        await verifyEmailAPI(token);
        setStatus('success');
        setMessage('Email verified successfully! Redirecting to login...');
        
        timeoutId = setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Failed to verify email. The link may be invalid or expired.');
      }
    };

    verifyEmail();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0a0a0a] p-4">
      <div className="max-w-md w-full bg-white dark:bg-[#111111] rounded-2xl shadow-xl border border-slate-200 dark:border-[#262626] p-8 text-center">
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-indigo-100 dark:border-indigo-900/30 border-t-indigo-600 dark:border-t-indigo-500 rounded-full animate-spin mb-6"></div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Verifying Email
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              {message}
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-500 rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl">check_circle</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Verified!
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              {message}
            </p>
            <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 animate-[progress_3s_ease-in-out_forwards]"></div>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl">cancel</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Verification Failed
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8">
              {message}
            </p>
            <Link 
              to="/login"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
            >
              Back to Login
            </Link>
          </div>
        )}
      </div>

      <style>{`
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default VerifyEmailPage;
