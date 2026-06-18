import axios from 'axios';

console.log("BASE URL:", import.meta.env.VITE_BASEURL);
const api = axios.create({
    baseURL: import.meta.env.VITE_BASEURL,
})

export default api;