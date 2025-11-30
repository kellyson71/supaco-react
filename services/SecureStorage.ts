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
     * Saves data to localStorage in readable JSON format and updates timestamp.
     */
    saveItem: (matricula: string, endpoint: string, data: any) => {
        try {
            const key = SecureStorage.getKey(matricula, endpoint);
            // Saving with indentation (null, 2) to make it "entendível" (readable)
            localStorage.setItem(key, JSON.stringify(data, null, 2)); 
            localStorage.setItem(`${key}_ts`, Date.now().toString());
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
     * Checks if the cached data is valid based on TTL (in minutes).
     */
    isCacheValid: (matricula: string, endpoint: string, ttlMinutes: number) => {
        try {
            const key = SecureStorage.getKey(matricula, endpoint);
            const ts = localStorage.getItem(`${key}_ts`);
            const data = localStorage.getItem(key);
            
            if (!data || !ts) return false;

            const now = Date.now();
            const cacheTime = parseInt(ts, 10);
            const diffMinutes = (now - cacheTime) / (1000 * 60);

            return diffMinutes < ttlMinutes;
        } catch (e) {
            return false;
        }
    },

    /**
     * Removes specific user data and timestamp.
     */
    removeItem: (matricula: string, endpoint: string) => {
        const key = SecureStorage.getKey(matricula, endpoint);
        localStorage.removeItem(key);
        localStorage.removeItem(`${key}_ts`);
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
            const achievements = SecureStorage.loadItem(matricula, 'achievements');
            
            // Collect settings from root localStorage and map to the specific JSON structure
            const google_tokens = SecureStorage.loadItem(matricula, 'google_tokens');
            
            // Default Pomodoro Settings
            const defaultPomodoro = { long: 15, focus: 25, short: 5, sound: true, notification: true };
            const localPomodoro = JSON.parse(localStorage.getItem('supaco_pomodoro_settings') || 'null');

            // Default Performance Settings
            const defaultPerformance = { disableBlur: false, disableGlow: false, reduceMotion: false };
            const localPerformance = JSON.parse(localStorage.getItem('suap_performance_settings') || 'null');

            const preferences = {
                visual: {
                    themeMode: localStorage.getItem('suap_saved_theme_mode') || 'dark',
                    wallpaper: localStorage.getItem('suap_saved_wallpaper') || "https://images2.alphacoders.com/134/thumb-1920-1345658.png",
                    themeVariant: localStorage.getItem('suap_saved_theme_variant') || 'dynamic',
                    customPhotoUrl: localStorage.getItem('suap_custom_photo') || '',
                    useCustomPhoto: localStorage.getItem('suap_use_custom_photo') === 'true'
                },
                privacy: {
                    privacyMode: false 
                },
                widgets: {
                    pomodoro: localPomodoro || defaultPomodoro
                },
                behavior: {
                    startView: "DASHBOARD",
                    autoExpandClassroom: false
                },
                performance: localPerformance || defaultPerformance,
                notifications: {
                    enabled: true,
                    gradeAlerts: true,
                    absenceAlerts: true
                },
                // We keep google_tokens here to persist auth across devices, 
                // even if not strictly "preferences", it is part of user config.
                // Assuming the backend 'preferences' column is JSONB and allows arbitrary fields.
                _system: {
                    google_tokens
                }
            };

            const payload = {
                id: matricula,
                profile,
                academic,
                completion,
                grades,
                schedule,
                preferences, // Matches the requested column name/structure
                todos,
                achievements,
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
     * Returns object with data status and preferences for immediate UI update.
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
                return { hasData: false };
            }

            // Restore academic data
            if (data.profile) SecureStorage.saveItem(matricula, 'profile', data.profile);
            if (data.academic) SecureStorage.saveItem(matricula, 'academic', data.academic);
            if (data.completion) SecureStorage.saveItem(matricula, 'completion', data.completion);
            if (data.grades) SecureStorage.saveItem(matricula, 'grades', data.grades);
            if (data.schedule) SecureStorage.saveItem(matricula, 'schedule', data.schedule);
            if (data.todos) SecureStorage.saveItem(matricula, 'todos', data.todos);
            if (data.achievements) SecureStorage.saveItem(matricula, 'achievements', data.achievements);
            
            // Restore Preferences to localStorage
            const prefs = data.preferences || data.settings; // Fallback to 'settings' if 'preferences' is null (migration)
            
            if (prefs) {
                // Visual
                if (prefs.visual) {
                    if (prefs.visual.wallpaper) localStorage.setItem('suap_saved_wallpaper', prefs.visual.wallpaper);
                    if (prefs.visual.themeVariant) localStorage.setItem('suap_saved_theme_variant', prefs.visual.themeVariant);
                    if (prefs.visual.themeMode) localStorage.setItem('suap_saved_theme_mode', prefs.visual.themeMode);
                    if (prefs.visual.customPhotoUrl) localStorage.setItem('suap_custom_photo', prefs.visual.customPhotoUrl);
                    if (prefs.visual.useCustomPhoto !== undefined) localStorage.setItem('suap_use_custom_photo', String(prefs.visual.useCustomPhoto));
                }
                
                // Performance
                if (prefs.performance) {
                    localStorage.setItem('suap_performance_settings', JSON.stringify(prefs.performance));
                }

                // Widgets
                if (prefs.widgets && prefs.widgets.pomodoro) {
                    localStorage.setItem('supaco_pomodoro_settings', JSON.stringify(prefs.widgets.pomodoro));
                }

                // Tokens (System)
                if (prefs._system && prefs._system.google_tokens) {
                     SecureStorage.saveItem(matricula, 'google_tokens', prefs._system.google_tokens);
                } else if (prefs.google_tokens) {
                     // Fallback for old structure
                     SecureStorage.saveItem(matricula, 'google_tokens', prefs.google_tokens);
                }
            }

            console.log(`[Storage] Cloud load successful for ${matricula}`);
            // Return preferences object so the UI can update state immediately. 
            // App.tsx checks for 'settings' property in previous logic, so we map 'preferences' to it or App.tsx needs update. 
            // We'll return both for compatibility.
            return { hasData: true, settings: prefs, preferences: prefs };
        } catch (error: any) {
            const errorMessage = error?.message || error?.error_description || (typeof error === 'object' ? JSON.stringify(error) : String(error));
            console.error(`[Storage] Cloud load failed: ${errorMessage}`);
            return { hasData: false };
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
     * Checks subscription status securely using a Postgres Function (RPC).
     */
    checkSubscriptionStatus: async (matricula: string) => {
        try {
            // console.log(`[Premium Check] Checking status via RPC for ${matricula}...`);
            const { data, error } = await supabase
                .rpc('check_subscription_status', { user_matricula: matricula });

            if (error) {
                console.error("[Premium Check] RPC error:", error);
                return false;
            }
            return !!data;
        } catch (e) {
            console.error("[Premium Check] Unexpected error:", e);
            return false;
        }
    },

    isAdmin: (matricula: string | undefined | null) => {
        if (!matricula) return false;
        const TARGET_HASH = "MDMwMDQwNDkwMTUyMDI="; 
        try {
            const inputHash = btoa(matricula.split('').reverse().join(''));
            return inputHash === TARGET_HASH;
        } catch (e) {
            return false;
        }
    }
};