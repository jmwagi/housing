import { restoreSession, updateNav, router } from './router.js';

export function togglePassword(inputId, icon) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    icon.className = isPassword ? 'fas fa-eye-slash toggle-password' : 'fas fa-eye toggle-password';
}
window.togglePassword = togglePassword;

window.addEventListener('DOMContentLoaded', async () => {
    await restoreSession();
    updateNav();
    router();
});

window.addEventListener('hashchange', router);
