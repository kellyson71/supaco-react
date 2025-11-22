
// Service for simulating a folder-based cache structure in localStorage.
// Data is stored as readable JSON as requested.
// Structure: matricula/[student_id]/[endpoint]

export const SecureStorage = {
    /**
     * Generates a unique storage key mimicking a folder structure.
     * Format: matricula/[matricula]/[endpoint]
     */
    getKey: (matricula: string, endpoint: string) => {
        return `matricula/${matricula}/${endpoint}`;
    },

    /**
     * Saves data to localStorage in readable JSON format.
     */
    saveItem: (matricula: string, endpoint: string, data: any) => {
        try {
            const key = SecureStorage.getKey(matricula, endpoint);
            // Saving with indentation (null, 2) to make it "entendível" (readable)
            localStorage.setItem(key, JSON.stringify(data, null, 2)); 
            console.log(`[Storage] Saved readable data to ${key}`);
        } catch (error) {
            console.error("[Storage] Save failed:", error);
        }
    },

    /**
     * Loads data from localStorage.
     */
    loadItem: (matricula: string, endpoint: string) => {
        try {
            const key = SecureStorage.getKey(matricula, endpoint);
            const item = localStorage.getItem(key);
            
            if (!item) return null;
            
            return JSON.parse(item);
        } catch (error) {
            console.error("[Storage] Load failed:", error);
            return null;
        }
    },

    /**
     * Removes specific user data.
     */
    removeItem: (matricula: string, endpoint: string) => {
        const key = SecureStorage.getKey(matricula, endpoint);
        localStorage.removeItem(key);
    },

    /**
     * Clears all data for a specific user (simulating deleting the user's folder).
     */
    clearUserData: (matricula: string) => {
        const prefix = `matricula/${matricula}/`;
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(prefix)) {
                localStorage.removeItem(key);
            }
        });
        console.log(`[Storage] Wiped data for user ${matricula}`);
    }
};
