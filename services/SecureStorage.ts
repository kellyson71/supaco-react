

import { supabase } from './supabaseClient';
import { UserPreferences, ViewState } from '../types';

// Service for simulating a folder-based cache structure in localStorage.
// Data is stored as readable JSON as requested.
// Structure: matricula/[student_id]/[endpoint]

export const DEFAULT_PREFERENCES: UserPreferences = {
  visual: {
    themeMode: 'dark',
    wallpaper: "https://images2.alphacoders.com/134/thumb-1920-1345658.png",
    themeVariant: 'dynamic',
    customPhotoUrl: '',
    useCustomPhoto: false
  },
  privacy: {
    privacyMode: false
  },
  widgets: {
    pomodoro: {
      focus: 25,
      short: 5,
      long: 15,
      sound: true,
      notification: true
    }
  },
  behavior: {
    startView: ViewState.DASHBOARD,
    autoExpandClassroom: false
  },
  performance: {
    reduceMotion: false,
    disableBlur: false,
    disableGlow: false
  },
  notifications: {
    enabled: true,
    gradeAlerts: true,
    absenceAlerts: true
  }
};

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
     * Updates ONLY the preferences column in Supabase.
     */
    savePreferences: async (matricula: string, prefs: UserPreferences) => {
        try {
            // 1. Save locally first for instant feedback
            SecureStorage.saveItem(matricula, 'preferences', prefs);

            // 2. Sync to cloud
            const { error } = await supabase
                .from('user_data')
                .update({ 
                    preferences: prefs,
                    updated_at: new Date().toISOString()
                })
                .eq('id', matricula);

            if (error) throw error;
            // console.log("[Storage] Preferences synced to cloud.");
            return true;
        } catch (e) {
            console.error("[Storage] Failed to save preferences to cloud:", e);
            return false;
        }
    },

    /**
     * Fetches ONLY the preferences from Supabase (Blocking call for startup).
     */
    getPreferencesFromCloud: async (matricula: string): Promise<UserPreferences | null> => {
        try {
            const { data, error } = await supabase
                .from('user_data')
                .select('preferences')
                .eq('id', matricula)
                .single();
            
            if (error || !data) return null;
            return data.preferences as UserPreferences;
        } catch (e) {
            console.error("[Storage] Failed to fetch preferences:", e);
            return null;
        }
    },

    /**
     * Syncs all local data for a user to Supabase.
     */
    syncToCloud: async (matricula: string) => {
        try {
            // console.log(`[Storage] Starting cloud sync for ${matricula}...`);
            const profile = SecureStorage.loadItem(matricula, 'profile');
            const academic = SecureStorage.loadItem(matricula, 'academic');
            const completion = SecureStorage.loadItem(matricula, 'completion');
            const grades = SecureStorage.loadItem(matricula, 'grades');
            const schedule = SecureStorage.loadItem(matricula, 'schedule');
            const todos = SecureStorage.loadItem(matricula, 'todos');
            const achievements = SecureStorage.loadItem(matricula, 'achievements');
            const google_tokens = SecureStorage.loadItem(matricula, 'google_tokens');
            
            // Note: preferences are handled separately via savePreferences usually, but good to include for full backup
            const preferences = SecureStorage.loadItem(matricula, 'preferences');

            const payload = {
                id: matricula,
                profile,
                academic,
                completion,
                grades,
                schedule,
                todos,
                achievements,
                preferences, // New JSONB column
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
            
            // Restore Preferences
            if (data.preferences) {
                SecureStorage.saveItem(matricula, 'preferences', data.preferences);
            }

            console.log(`[Storage] Cloud load successful for ${matricula}`);
            // Return preferences so the UI can update state immediately
            return { hasData: true, preferences: data.preferences };
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