
import { supabase } from './supabaseClient';

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
    },

    /**
     * Syncs all local data for a user to Supabase.
     */
    syncToCloud: async (matricula: string) => {
        try {
            console.log(`[Storage] Starting cloud sync for ${matricula}...`);
            const profile = SecureStorage.loadItem(matricula, 'profile');
            const academic = SecureStorage.loadItem(matricula, 'academic');
            const completion = SecureStorage.loadItem(matricula, 'completion');
            const grades = SecureStorage.loadItem(matricula, 'grades');
            const schedule = SecureStorage.loadItem(matricula, 'schedule');
            const todos = SecureStorage.loadItem(matricula, 'todos');
            
            // Collect settings from root localStorage
            const settings = {
                wallpaper: localStorage.getItem('suap_saved_wallpaper'),
                theme_variant: localStorage.getItem('suap_saved_theme_variant'),
                theme_mode: localStorage.getItem('suap_saved_theme_mode'),
                performance: JSON.parse(localStorage.getItem('suap_performance_settings') || 'null'),
                custom_photo: localStorage.getItem('suap_custom_photo'),
                use_custom_photo: localStorage.getItem('suap_use_custom_photo')
            };

            const payload = {
                id: matricula,
                profile,
                academic,
                completion,
                grades,
                schedule,
                settings,
                todos,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('user_data')
                .upsert(payload);

            if (error) {
                console.error("[Storage] Supabase detailed error:", JSON.stringify(error));
                throw error;
            }

            console.log(`[Storage] Cloud sync successful for ${matricula}`);
            return true;
        } catch (error: any) {
            const errorMessage = error?.message || error?.error_description || (typeof error === 'object' ? JSON.stringify(error) : String(error));
            console.error(`[Storage] Cloud sync failed: ${errorMessage}`);
            return false;
        }
    },

    /**
     * Loads data from Supabase and updates local storage.
     */
    syncFromCloud: async (matricula: string) => {
        try {
            console.log(`[Storage] Loading from cloud for ${matricula}...`);
            const { data, error } = await supabase
                .from('user_data')
                .select('*')
                .eq('id', matricula)
                .single();

            if (error) {
                console.error("[Storage] Supabase load error:", JSON.stringify(error));
                throw error;
            }
            if (!data) {
                console.log("[Storage] No cloud data found.");
                return false;
            }

            if (data.profile) SecureStorage.saveItem(matricula, 'profile', data.profile);
            if (data.academic) SecureStorage.saveItem(matricula, 'academic', data.academic);
            if (data.completion) SecureStorage.saveItem(matricula, 'completion', data.completion);
            if (data.grades) SecureStorage.saveItem(matricula, 'grades', data.grades);
            if (data.schedule) SecureStorage.saveItem(matricula, 'schedule', data.schedule);
            if (data.todos) SecureStorage.saveItem(matricula, 'todos', data.todos);
            
            if (data.settings) {
                if(data.settings.wallpaper) localStorage.setItem('suap_saved_wallpaper', data.settings.wallpaper);
                if(data.settings.theme_variant) localStorage.setItem('suap_saved_theme_variant', data.settings.theme_variant);
                if(data.settings.theme_mode) localStorage.setItem('suap_saved_theme_mode', data.settings.theme_mode);
                if(data.settings.performance) localStorage.setItem('suap_performance_settings', JSON.stringify(data.settings.performance));
                if(data.settings.custom_photo) localStorage.setItem('suap_custom_photo', data.settings.custom_photo);
                if(data.settings.use_custom_photo) localStorage.setItem('suap_use_custom_photo', data.settings.use_custom_photo);
            }

            console.log(`[Storage] Cloud load successful for ${matricula}`);
            return true;
        } catch (error: any) {
            const errorMessage = error?.message || error?.error_description || (typeof error === 'object' ? JSON.stringify(error) : String(error));
            console.error(`[Storage] Cloud load failed: ${errorMessage}`);
            return false;
        }
    },

    /**
     * Fetches all registered users from Supabase (Admin Only function effectively)
     */
    getAllUsers: async () => {
        try {
            const { data, error } = await supabase
                .from('user_data')
                .select('id, profile, academic, updated_at')
                .order('updated_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error("[Storage] Get all users failed:", error);
            return [];
        }
    },

    /**
     * Checks if the provided matricula belongs to an admin.
     * Uses simple obfuscation to avoid hardcoding the plain text ID in the bundle.
     */
    isAdmin: (matricula: string | undefined | null) => {
        if (!matricula) return false;
        // Target is the Admin Matricula but stored as Base64 of its reverse to prevent grep/search in DevTools.
        // Plain: "20251094040030" -> Reverse: "03004049015202" -> Base64: "MDMwMDQwNDkwMTUyMDI="
        const TARGET_HASH = "MDMwMDQwNDkwMTUyMDI="; 
        try {
            const inputHash = btoa(matricula.split('').reverse().join(''));
            return inputHash === TARGET_HASH;
        } catch (e) {
            return false;
        }
    }
};
