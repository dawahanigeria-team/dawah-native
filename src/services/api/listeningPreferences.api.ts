import type { ListeningPreferences } from "../../types/listeningPreferences.types";
import { apiClient } from "./base.api";

interface PreferencesResponse {
  success: boolean;
  message: string;
  data: ListeningPreferences;
  timestamp: number;
}

class ListeningPreferencesApi {
  async get(): Promise<ListeningPreferences> {
    const response = await apiClient.post<PreferencesResponse>(
      "/api/listening_preferences.php",
      { action: "get" },
    );
    return response.data.data;
  }

  async update(
    preferences: Pick<ListeningPreferences, "languageIds" | "lecturerIds">,
  ): Promise<ListeningPreferences> {
    const response = await apiClient.post<PreferencesResponse>(
      "/api/listening_preferences.php",
      {
        action: "update",
        languageIds: preferences.languageIds,
        lecturerIds: preferences.lecturerIds,
      },
    );
    return response.data.data;
  }
}

export const listeningPreferencesApi = new ListeningPreferencesApi();
