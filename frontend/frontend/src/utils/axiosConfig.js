import axios from 'axios';
import Cookies from 'universal-cookie';
import { baseURL } from './constants';

const axiosInstance = axios.create({
    baseURL: baseURL,
});

axiosInstance.interceptors.request.use(
    (config) => {
        const cookies = new Cookies();
        const token = cookies.get('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            const cookies = new Cookies();
            cookies.remove('token');
            localStorage.removeItem('user');
            // Redirect to login page
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
