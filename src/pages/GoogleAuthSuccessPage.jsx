import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/slices/authSlice.js';
import api from '../services/axios.js';

const GoogleAuthSuccessPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    useEffect(() => {
        const token = searchParams.get('token');

        if (!token) {
            navigate('/login?error=google_failed');
            return;
        }

        const fetchUser = async () => {
            try {
                const response = await api.get('/auth/me', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                dispatch(setCredentials({
                    user: response.data.user,
                    token
                }));
                navigate('/dashboard');
            } catch (_err) {
                navigate('/login?error=google_failed');
            }
        };

        fetchUser();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f]">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent 
          rounded-full animate-spin mx-auto mb-4"/>
                <p className="text-white text-sm">Signing you in with Google...</p>
            </div>
        </div>
    );
};

export default GoogleAuthSuccessPage;
