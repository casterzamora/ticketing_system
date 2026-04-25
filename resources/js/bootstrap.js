import axios from 'axios';
window.axios = axios;

// Required for session/cookie auth when frontend and backend are on different origins in dev.
window.axios.defaults.withCredentials = true;
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
