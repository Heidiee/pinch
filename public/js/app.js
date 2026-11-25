(() => {
    const root = document.getElementById('app');
    let settings = window.PINCH_DEFAULT_SETTINGS;

    async function api(path, options) {
        const response = await fetch(path, options);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not connect to the wishlist.');
        return data;
    }

    const loadItems = async () => (await api('/api/items')).items;

    async function loadSettings() {
        try {
            settings = (await api('/api/settings')).settings;
        } catch {
            // Keep the last known (or default) settings so the app still works offline.
        }
        return settings;
    }

    async function saveSettings(patch) {
        settings = (await api('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch)
        })).settings;
        return settings;
    }

    function showHome() {
        window.mountHome(root, { onAdd: showAdd, onSettings: showSettings, onUpdate: updateItem, onDelete: deleteItem, loadItems, settings });
    }

    async function updateItem(id, patch) {
        await api(`/api/items/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch)
        });
        showHome();
    }

    async function deleteItem(id) {
        const response = await fetch(`/api/items/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (!response.ok && response.status !== 404) throw new Error('Could not delete this item.');
        showHome();
    }

    async function saveItem(item) {
        await api('/api/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });
        showHome();
    }

    function showAdd() {
        window.mountAddFlow(root, { onHome: showHome, onComplete: saveItem, onSettings: showSettings, settings });
    }

    function showSettings() {
        window.mountSettings(root, { settings, loadItems, saveSettings, onHome: showHome, onAdd: showAdd });
    }

    function startJourney() {
        window.mountJourney(root, { onComplete: saveItem, onHome: showHome, onSettings: showSettings, settings });
    }

    window.setTimeout(async () => {
        try {
            const [items] = await Promise.all([loadItems(), loadSettings()]);
            if (items.length) showHome();
            else window.mountOnboarding(root, startJourney);
        } catch {
            showHome();
        }
    }, 2500);
})();
