import api from '../../services/axios.js';

export const loginAPI = async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
};

export const registerAPI = async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
};

export const logoutAPI = async () => {
    const response = await api.post('/auth/logout');
    return response.data;
};

export const forgotPasswordAPI = async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
};

export const resetPasswordAPI = async (token, password) => {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
};

export const verifyEmailAPI = async (token) => {
    const response = await api.get(`/auth/verify-email/${token}`);
    return response.data;
};