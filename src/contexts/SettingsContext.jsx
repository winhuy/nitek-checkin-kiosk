import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const SettingsContext = createContext();

const SETTING_KEY = 'default_landing_view';
const STORAGE_KEY = 'nitek_default_landing_view';

export function SettingsProvider({ children }) {
  const [defaultLandingView, setDefaultLandingViewState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'auto'; // 'auto' | 'event' | 'club'
  });
  const [loading, setLoading] = useState(true);

  // Fetch setting from Supabase or fallback to localStorage
  const fetchSettings = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', SETTING_KEY)
        .maybeSingle();

      if (!error && data && data.value) {
        setDefaultLandingViewState(data.value);
        localStorage.setItem(STORAGE_KEY, data.value);
      }
    } catch (_err) {
      // Table may not exist yet, gracefully use localStorage
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();

    if (!supabase) return;

    // Realtime listener for system_settings
    const channel = supabase
      .channel('system-settings-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings' },
        (payload) => {
          if (payload.new && payload.new.key === SETTING_KEY && payload.new.value) {
            setDefaultLandingViewState(payload.new.value);
            localStorage.setItem(STORAGE_KEY, payload.new.value);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const setDefaultLandingView = async (newView) => {
    setDefaultLandingViewState(newView);
    localStorage.setItem(STORAGE_KEY, newView);

    if (supabase) {
      try {
        await supabase
          .from('system_settings')
          .upsert({
            key: SETTING_KEY,
            value: newView,
            updated_at: new Date().toISOString(),
          });
      } catch (err) {
        console.warn('Could not persist system setting to Supabase:', err);
      }
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        defaultLandingView,
        setDefaultLandingView,
        loading,
        fetchSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
