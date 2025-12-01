


import { supabase } from './supabaseClient';
import { AIHistoryItem, AIHistoryType } from '../types';

// Helper for robust Supabase calls with retry logic
const safeSupabaseCall = async <T>(
    operation: () => Promise<{ data: T | null; error: any }>, 
    retries = 2, 
    delay = 1000
): Promise<{ data: T | null; error: any }> => {
    if (!navigator.onLine) {
        return { data: null, error: { message: "Offline mode", code: "OFFLINE" } };
    }

    for (let i = 0; i <= retries; i++) {
        try {
            const result = await operation();
            if (result.error) {
                // If it's not a network error (e.g. 409 Conflict, 403 Forbidden), throw immediately unless it's a fetch failure
                const msg = result.error.message || '';
                if (!msg.includes('Failed to fetch') && !msg.includes('Network request failed')) {
                    return result;
                }
                throw result.error;
            }
            return result;
        } catch (err: any) {
            const isLastAttempt = i === retries;
            const msg = err?.message || '';
            const isNetworkError = msg.includes('Failed to fetch') || msg.includes('Network request failed');

            if (isNetworkError && !isLastAttempt) {
                console.warn(`[Storage] Network error, retrying (${i + 1}/${retries})...`);
                await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i))); // Exponential backoff
                continue;
            }
            
            if (isLastAttempt) {
                console.error(`[Storage] Operation failed after ${retries} retries:`, err);
                return { data: null, error: err };
            }
        }
    }
    return { data: null, error: { message: "Unknown error" } };
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

    // --- AI HISTORY METHODS (Dedicated Table) ---

    /**
     * Fetches AI History from Supabase (specific table) and caches it.
     */
    fetchHistory: async (matricula: string): Promise<AIHistoryItem[]> => {
        // First check local cache for immediate display
        const cached = SecureStorage.loadItem(matricula, 'ai_history_cache');
        
        if (!navigator.onLine) return cached || [];

        // Background fetch with safety wrapper
        const { data, error } = await safeSupabaseCall(() => 
            supabase
                .from('ai_history')
                .select('*')
                .eq('user_id', matricula)
                .order('created_at', { ascending: false })
        );

        if (error) {
            console.warn("[Storage] Fetch History warning:", error.message);
            return cached || [];
        }

        if (data) {
            SecureStorage.saveItem(matricula, 'ai_history_cache', data);
            return data as AIHistoryItem[];
        }
        
        return cached || [];
    },

    /**
     * Adds an item to the AI History table.
     */
    addHistoryItem: async (matricula: string, type: AIHistoryType, title: string, content: any): Promise<AIHistoryItem | null> => {
        const optimisticItem: AIHistoryItem = {
            id: Date.now().toString(), // Temp ID
            user_id: matricula,
            type,
            title,
            content,
            created_at: new Date().toISOString()
        };

        // Update local cache optimistically
        const currentCache = SecureStorage.loadItem(matricula, 'ai_history_cache') || [];
        SecureStorage.saveItem(matricula, 'ai_history_cache', [optimisticItem, ...currentCache]);

        if (!navigator.onLine) {
            // Queue for later sync could be implemented here
            return optimisticItem;
        }

        const { data, error } = await safeSupabaseCall(() => 
            supabase
                .from('ai_history')
                .insert({
                    user_id: matricula,
                    type,
                    title,
                    content
                })
                .select()
                .single()
        );

        if (error) {
            console.error("[Storage] Add History Failed:", error.message);
            return optimisticItem;
        }
        
        // Replace temp item with real item in cache
        if (data) {
            const reloadedCache = SecureStorage.loadItem(matricula, 'ai_history_cache') || [];
            // Remove optimistic one (by matching temp ID logic or just filtering out based on similarity if needed, 
            // but here we just replace the one we just added if we still have the ref, or reload)
            const patchedCache = reloadedCache.map((i: any) => i.id === optimisticItem.id ? data : i);
            SecureStorage.saveItem(matricula, 'ai_history_cache', patchedCache);
            return data as AIHistoryItem;
        }
        return optimisticItem;
    },

    /**
     * Updates an existing history item.
     */
    updateHistoryItem: async (matricula: string, itemId: string, content: any) => {
        // Optimistic update
        const currentCache = SecureStorage.loadItem(matricula, 'ai_history_cache') || [];
        const updatedCache = currentCache.map((h: AIHistoryItem) => 
            h.id === itemId ? { ...h, content } : h
        );
        SecureStorage.saveItem(matricula, 'ai_history_cache', updatedCache);

        if (!navigator.onLine) return;

        // Skip update if it's a temp ID (offline item)
        if (!itemId.includes('-') && itemId.length < 20) return; 

        await safeSupabaseCall(() => 
            supabase
                .from('ai_history')
                .update({ content })
                .eq('id', itemId)
        );
    },

    /**
     * Deletes an item from history table.
     */
    deleteHistoryItem: async (matricula: string, itemId: string) => {
        // Optimistic delete
        const currentCache = SecureStorage.loadItem(matricula, 'ai_history_cache') || [];
        const updatedCache = currentCache.filter((h: AIHistoryItem) => h.id !== itemId);
        SecureStorage.saveItem(matricula, 'ai_history_cache', updatedCache);

        if (!navigator.onLine) return;

        await safeSupabaseCall(() => 
            supabase
                .from('ai_history')
                .delete()
                .eq('id', itemId)
        );
    },

    // ---------------------------

    /**
     * Syncs all local data for a user to Supabase.
     */
    syncToCloud: async (matricula: string) => {
        if (!navigator.onLine) {
            console.log("[Storage] Offline, skipping cloud sync.");
            return false;
        }

        try {
            // console.log(`[Storage] Starting cloud sync for ${matricula}...`);
            const profile = SecureStorage.loadItem(matricula, 'profile');
            const academic = SecureStorage.loadItem(matricula, 'academic');
            const completion = SecureStorage.loadItem(matricula, 'completion');
            const grades = SecureStorage.loadItem(matricula, 'grades');
            const schedule = SecureStorage.loadItem(matricula, 'schedule');
            const todos = SecureStorage.loadItem(matricula, 'todos');
            const achievements = SecureStorage.loadItem(matricula, 'achievements');
            const notifications = SecureStorage.loadItem(matricula, 'notifications');
            
            // Load tokens to embed in settings
            const google_tokens = SecureStorage.loadItem(matricula, 'google_tokens');
            
            // Collect settings from root localStorage
            const settings = {
                wallpaper: localStorage.getItem('suap_saved_wallpaper'),
                theme_variant: localStorage.getItem('suap_saved_theme_variant'),
                theme_mode: localStorage.getItem('suap_saved_theme_mode'),
                performance: JSON.parse(localStorage.getItem('suap_performance_settings') || 'null'),
                custom_photo: localStorage.getItem('suap_custom_photo'),
                use_custom_photo: localStorage.getItem('suap_use_custom_photo'),
                google_tokens: google_tokens 
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
                achievements,
                notifications,
                updated_at: new Date().toISOString()
            };

            const { error } = await safeSupabaseCall(() => 
                supabase.from('user_data').upsert(payload)
            );

            if (error) {
                // Only log if it's a real error, not just offline/fetch failure which is warned in safeSupabaseCall
                if (error.message !== "Offline mode" && !error.message?.includes('fetch')) {
                    console.error("[Storage] Supabase upsert error:", error);
                }
                return false;
            }

            console.log(`[Storage] Cloud sync successful for ${matricula}`);
            return true;
        } catch (error: any) {
            console.error(`[Storage] Cloud sync exception: ${error.message}`);
            return false;
        }
    },

    /**
     * Loads data from Supabase and updates local storage.
     */
    syncFromCloud: async (matricula: string) => {
        if (!navigator.onLine) return { hasData: false };

        try {
            console.log(`[Storage] Loading from cloud for ${matricula}...`);
            
            // Parallel fetch for speed
            const [userDataResult, historyResult] = await Promise.all([
                safeSupabaseCall(() => supabase.from('user_data').select('*').eq('id', matricula).single()),
                SecureStorage.fetchHistory(matricula)
            ]);

            const { data, error } = userDataResult;
            
            // Cast data to any to access properties safely
            const userCloudData = data as any;

            if (error) {
                console.warn("[Storage] Cloud load warning:", error.message);
                return { hasData: false };
            }
            
            if (!userCloudData) {
                return { hasData: false };
            }

            // Restore data
            if (userCloudData.profile) SecureStorage.saveItem(matricula, 'profile', userCloudData.profile);
            if (userCloudData.academic) SecureStorage.saveItem(matricula, 'academic', userCloudData.academic);
            if (userCloudData.completion) SecureStorage.saveItem(matricula, 'completion', userCloudData.completion);
            if (userCloudData.grades) SecureStorage.saveItem(matricula, 'grades', userCloudData.grades);
            if (userCloudData.schedule) SecureStorage.saveItem(matricula, 'schedule', userCloudData.schedule);
            if (userCloudData.todos) SecureStorage.saveItem(matricula, 'todos', userCloudData.todos);
            if (userCloudData.achievements) SecureStorage.saveItem(matricula, 'achievements', userCloudData.achievements);
            if (userCloudData.notifications) SecureStorage.saveItem(matricula, 'notifications', userCloudData.notifications);
            
            // Restore Settings
            if (userCloudData.settings) {
                if(userCloudData.settings.wallpaper) localStorage.setItem('suap_saved_wallpaper', userCloudData.settings.wallpaper);
                if(userCloudData.settings.theme_variant) localStorage.setItem('suap_saved_theme_variant', userCloudData.settings.theme_variant);
                if(userCloudData.settings.theme_mode) localStorage.setItem('suap_saved_theme_mode', userCloudData.settings.theme_mode);
                if(userCloudData.settings.performance) localStorage.setItem('suap_performance_settings', JSON.stringify(userCloudData.settings.performance));
                if(userCloudData.settings.custom_photo) localStorage.setItem('suap_custom_photo', userCloudData.settings.custom_photo);
                if(userCloudData.settings.use_custom_photo) localStorage.setItem('suap_use_custom_photo', userCloudData.settings.use_custom_photo);
                
                if(userCloudData.settings.google_tokens) {
                    SecureStorage.saveItem(matricula, 'google_tokens', userCloudData.settings.google_tokens);
                }
            }

            return { hasData: true, settings: userCloudData.settings };
        } catch (error: any) {
            console.error(`[Storage] Cloud load exception: ${error.message}`);
            return { hasData: false };
        }
    },

    /**
     * Fetches all registered users from Supabase (Admin Only)
     */
    getAllUsers: async () => {
        const { data, error } = await safeSupabaseCall(() => 
            supabase
                .from('user_data')
                .select('id, profile, academic, updated_at')
                .order('updated_at', { ascending: false })
        );

        if (error) {
            console.error("[Storage] Get all users failed:", error);
            return [];
        }
        return (data as any[]) || [];
    },

    /**
     * Checks subscription status securely.
     */
    checkSubscriptionStatus: async (matricula: string) => {
        const { data, error } = await safeSupabaseCall(() => 
            supabase.rpc('check_subscription_status', { user_matricula: matricula })
        );

        if (error) return false;
        return !!data;
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