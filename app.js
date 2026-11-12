(() => {
    const root = document.getElementById('app');
    async function api(path, options) {
        const response = await fetch(path, options);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not connect to the wishlist.');
        return data;
    }

    function showHome() {
        window.mountHome(root, {
            onAdd: showAdd,
            loadItems: async () => (await api('/api/items')).items
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
        window.mountAddFlow(root, { onHome: showHome, onComplete: saveItem });
    }

    function startJourney() {
        window.mountJourney(root, { onComplete: saveItem });
    }

    window.setTimeout(async () => {
        try {
            const { items } = await api('/api/items');
            if (items.length) showHome();
            else window.mountOnboarding(root, startJourney);
        } catch {
            showHome();
        }
    }, 2500);
})();
