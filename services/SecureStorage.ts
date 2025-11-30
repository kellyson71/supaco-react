

import { supabase } from './supabaseClient';
import { UserPreferences } from '../types';

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
            // console.log(`[Storage] Saved readable data to ${key}`);
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
    syncToCloud: async (matricula: string, currentPreferences?: UserPreferences) => {
        try {
            console.log(`[Storage] Starting cloud sync for ${matricula}...`);
            const profile = SecureStorage.loadItem(matricula, 'profile');
            const academic = SecureStorage.loadItem(matricula, 'academic');
            const completion = SecureStorage.loadItem(matricula, 'completion');
            const grades = SecureStorage.loadItem(matricula, 'grades');
            const schedule = SecureStorage.loadItem(matricula, 'schedule');
            const todos = SecureStorage.loadItem(matricula, 'todos');
            const achievements = SecureStorage.loadItem(matricula, 'achievements');
            const google_tokens = SecureStorage.loadItem(matricula, 'google_tokens');
            
            // Collect all settings into the new structured preferences object if not passed
            let preferences = currentPreferences;
            
            if (!preferences) {
                // Fallback: construct from individual local storage keys if app state isn't passed
                preferences = {
                    visual: {
                        themeMode: (localStorage.getItem('suap_saved_theme_mode') as 'light'|'dark') || 'light',
                        themeVariant: (localStorage.getItem('suap_saved_theme_variant') as any) || 'dynamic',
                        wallpaper: localStorage.getItem('suap_saved_wallpaper') || '',
                        customPhotoUrl: localStorage.getItem('suap_custom_photo') || '',
                        useCustomPhoto: localStorage.getItem('suap_use_custom_photo') === 'true',
                    },
                    performance: JSON.parse(localStorage.getItem('suap_performance_settings') || '{"reduceMotion":false,"disableBlur":false,"disableGlow":false}'),
                    privacy: {
                        privacyMode: localStorage.getItem('suap_privacy_mode') === 'true'
                    },
                    behavior: {
                        startView: (localStorage.getItem('suap_start_view') as any) || 'DASHBOARD',
                        autoExpandClassroom: false
                    },
                    notifications: {
                        enabled: localStorage.getItem('suap_notifications_enabled') !== 'false',
                        gradeAlerts: true,
                        absenceAlerts: true
                    },
                    widgets: {
                        pomodoro: JSON.parse(localStorage.getItem('supaco_pomodoro_settings') || '{"focus":25,"short":5,"long":15,"sound":true,"notification":true}')
                    }
                };
            }

            // Also keep google tokens in the secure storage object, not in general preferences JSON usually
            // but we can add it to the 'settings' or 'preferences' column for now.
            
            // To maintain backward compatibility with the 'settings' column if 'preferences' doesn't exist yet, we map to both
            // But we prefer the new 'preferences' JSONB column.
            
            const payload = {
                id: matricula,
                profile,
                academic,
                completion,
                grades,
                schedule,
                preferences: preferences, // New Column
                settings: { ...preferences, google_tokens }, // Legacy/Backup Column + Tokens
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
     * Returns object with data status and settings for immediate UI update.
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
            
            // Restore Preferences (Prioritize new 'preferences' column, fallback to 'settings')
            const prefs: UserPreferences = data.preferences || data.settings;
            
            if (prefs) {
                // Restore Visual
                if(prefs.visual?.wallpaper) localStorage.setItem('suap_saved_wallpaper', prefs.visual.wallpaper);
                if(prefs.visual?.themeMode) localStorage.setItem('suap_saved_theme_mode', prefs.visual.themeMode);
                if(prefs.visual?.themeVariant) localStorage.setItem('suap_saved_theme_variant', prefs.visual.themeVariant);
                if(prefs.visual?.customPhotoUrl) localStorage.setItem('suap_custom_photo', prefs.visual.customPhotoUrl);
                localStorage.setItem('suap_use_custom_photo', String(!!prefs.visual?.useCustomPhoto));

                // Restore Performance
                if(prefs.performance) localStorage.setItem('suap_performance_settings', JSON.stringify(prefs.performance));

                // Restore Privacy
                if(prefs.privacy) {
                    localStorage.setItem('suap_privacy_mode', String(!!prefs.privacy.privacyMode));
                }

                // Restore Behavior
                if(prefs.behavior?.startView) localStorage.setItem('suap_start_view', prefs.behavior.startView);

                // Restore Notifications
                if(prefs.notifications) {
                     localStorage.setItem('suap_notifications_enabled', String(!!prefs.notifications.enabled));
                }

                // Restore Widgets
                if(prefs.widgets?.pomodoro) {
                    localStorage.setItem('supaco_pomodoro_settings', JSON.stringify(prefs.widgets.pomodoro));
                }
                
                // RESTORE TOKENS (Check legacy settings location or separate store)
                // Note: SecureStorage saves tokens in 'settings' JSON blob in previous implementations
                if(data.settings?.google_tokens) {
                    SecureStorage.saveItem(matricula, 'google_tokens', data.settings.google_tokens);
                }
            }

            console.log(`[Storage] Cloud load successful for ${matricula}`);
            // Return settings object so the UI can update state immediately
            return { hasData: true, preferences: prefs };
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