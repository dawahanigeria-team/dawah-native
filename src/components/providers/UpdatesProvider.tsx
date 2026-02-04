/**
 * Updates Provider
 * Expo handles update checks automatically via app.json (checkAutomatically: ON_LOAD).
 * This component is now a no-op wrapper to avoid duplicate manual checks.
 */

interface UpdatesProviderProps {
  children: React.ReactNode;
}

export const UpdatesProvider: React.FC<UpdatesProviderProps> = ({ children }) => (
  <>{children}</>
);
