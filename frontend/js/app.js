window.addEventListener('DOMContentLoaded', async () => {
    await restoreSession();
    updateNav();
    router();
});

window.addEventListener('hashchange', router);
