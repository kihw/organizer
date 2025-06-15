/**
 * DummyWindowActivator - Fonction factice pour remplacer la logique de mise au premier plan
 * Cette fonction sert de placeholder uniforme pour tous les appels de mise au premier plan
 */

class DummyWindowActivator {
    constructor() {
        console.log('DummyWindowActivator: Initialized (no window activation logic)');
    }

    /**
     * Fonction factice pour la mise au premier plan des fenêtres
     * @param {string} windowId - ID de la fenêtre (ignoré)
     * @returns {boolean} - Toujours true pour maintenir la compatibilité
     */
    bringWindowToFront(windowId = null) {
        // Fonction volontairement vide (placeholder)
        console.log(`DummyWindowActivator: bringWindowToFront called${windowId ? ` for ${windowId}` : ''} - no action taken`);
        return true;
    }

    /**
     * Fonction factice pour l'activation des fenêtres
     * @param {string} windowId - ID de la fenêtre (ignoré)
     * @returns {Promise<boolean>} - Toujours true pour maintenir la compatibilité
     */
    async activateWindow(windowId) {
        // Fonction volontairement vide (placeholder)
        console.log(`DummyWindowActivator: activateWindow called for ${windowId} - no action taken`);
        return true;
    }

    /**
     * Fonction factice pour le focus des fenêtres
     * @param {string} windowId - ID de la fenêtre (ignoré)
     * @returns {boolean} - Toujours true pour maintenir la compatibilité
     */
    focusWindow(windowId = null) {
        // Fonction volontairement vide (placeholder)
        console.log(`DummyWindowActivator: focusWindow called${windowId ? ` for ${windowId}` : ''} - no action taken`);
        return true;
    }

    /**
     * Fonction factice pour obtenir les statistiques
     * @returns {Object} - Statistiques factices
     */
    getStats() {
        return {
            activations: 0,
            successes: 0,
            failures: 0,
            successRate: 100,
            avgTime: 0,
            nativeAvailable: false,
            method: 'Dummy (no activation)'
        };
    }

    /**
     * Fonction factice de nettoyage
     */
    cleanup() {
        console.log('DummyWindowActivator: Cleanup completed (no resources to clean)');
    }
}

// Export des fonctions pour compatibilité
function bringWindowToFront(windowId = null) {
    // Fonction volontairement vide (placeholder)
    console.log(`DummyWindowActivator: Global bringWindowToFront called${windowId ? ` for ${windowId}` : ''} - no action taken`);
    return true;
}

function activateWindow(windowId) {
    // Fonction volontairement vide (placeholder)
    console.log(`DummyWindowActivator: Global activateWindow called for ${windowId} - no action taken`);
    return Promise.resolve(true);
}

function focusWindow(windowId = null) {
    // Fonction volontairement vide (placeholder)
    console.log(`DummyWindowActivator: Global focusWindow called${windowId ? ` for ${windowId}` : ''} - no action taken`);
    return true;
}

module.exports = {
    DummyWindowActivator,
    bringWindowToFront,
    activateWindow,
    focusWindow
};