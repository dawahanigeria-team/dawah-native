import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../services/api/base.api';
import {
  applyListeningPreferences,
  getSpecialFeatures,
  SpecialFeatureGroup,
} from '../services/api/specialFeatures.api';
import { useListeningPreferencesStore } from '../stores/listeningPreferencesStore';

export function useSpecialFeatures() {
  const { preferences, isHydrated } = useListeningPreferencesStore();
  const [groups, setGroups] = useState<SpecialFeatureGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setGroups(await getSpecialFeatures());
    } catch (error) {
      if (error instanceof ApiError && error.isCancelled) return;
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => (isHydrated ? applyListeningPreferences(groups, preferences) : []),
    [groups, preferences, isHydrated],
  );

  return { groups: visible, loading: loading || !isHydrated, failed, reload: load };
}
