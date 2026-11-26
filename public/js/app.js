(() => {
    const root = document.getElementById('app');
    let settings = window.PINCH_DEFAULT_SETTINGS;
    let screen = 'splash';

    // Start each new screen at the top. The page scrolls on phones; inside the desktop phone frame the
    // app element scrolls instead, so reset both. Refreshing the same screen keeps its position.
    function enter(next) {
        if (next !== screen) {
            root.scrollTop = 0;
            window.scrollTo(0, 0);
        }
        screen = next;
    }

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
        enter('home');
        window.mountHome(root, { onAdd: showAdd, onSettings: showSettings, onOpen: showItem, onUpdate: updateItem, onDelete: deleteItem, loadItems, settings });
    }

    async function patchItem(id, patch) {
        return (await api(`/api/items/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch)
        })).item;
    }

    // From the home cards: save, then refresh the list.
    async function updateItem(id, patch) {
        await patchItem(id, patch);
        showHome();
    }

    async function deleteItem(id) {
        await removeItem(id);
        showHome();
    }

    async function removeItem(id) {
        const response = await fetch(`/api/items/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (!response.ok && response.status !== 404) throw new Error('Could not delete this item.');
        // Letting an item go is money saved: celebrate it (js/purse-popup.js).
        if (window.pinchSavedPopup) window.pinchSavedPopup();
    }

    // Item bottom sheet: opens over the wishlist and refreshes it on close if anything changed.
    async function showItem(id) {
        let items;
        try {
            items = await loadItems();
        } catch {
            window.alert('Could not open this item. Check your connection and try again.');
            return;
        }
        window.openItemSheet({
            itemId: id, items, settings,
            onUpdate: patchItem,
            onDelete: removeItem,
            onClose: changed => { if (changed) showHome(); }
        });
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
        enter('add');
        window.mountAddFlow(root, { onHome: showHome, onComplete: saveItem, onSettings: showSettings, settings });
    }

    function showSettings() {
        enter('settings');
        window.mountSettings(root, { settings, loadItems, saveSettings, onHome: showHome, onAdd: showAdd });
    }

    function startJourney() {
        enter('journey');
        window.mountJourney(root, { onComplete: saveItem, onHome: showHome, onSettings: showSettings, settings });
    }

    // Every app load (including a refresh) starts at the onboarding flow. Once on home, the + button
    // uses the normal add flow, so onboarding only shows again on the next refresh.
    window.setTimeout(async () => {
        await loadSettings();
        window.mountOnboarding(root, finishOnboarding, { categories: settings.categories });
    }, 2500);

    // The categories picked on the last onboarding step become the home filters (and the goals offered
    // when adding items). Picking none keeps the current ones.
    async function finishOnboarding(categories) {
        if (categories && categories.length) {
            try {
                await saveSettings({ categories });
            } catch {
                settings = { ...settings, categories }; // offline: use them for this visit
            }
        }
        startJourney();
    }
})();
