import { ChatSession } from "@/domain/entities/chat.entity";
import { logger } from "../../lib/logger";

class FirebaseSyncService {
  private dbUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

  private isEnabled(): boolean {
    return !!this.dbUrl && this.dbUrl.startsWith("http");
  }

  // Push a session update to Firebase
  async syncSession(session: ChatSession): Promise<boolean> {
    if (!this.isEnabled()) return false;

    try {
      const url = `${this.dbUrl}/sessions/${session.id}.json`;
      logger.info(`Syncing session to Firebase cloud store: ${session.id}`);

      const res = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...session,
          updatedAt: session.updatedAt.toString(),
          createdAt: session.createdAt.toString(),
        }),
      });

      if (!res.ok) {
        throw new Error(`Firebase returned status ${res.status}`);
      }

      logger.info(`Session synced successfully: ${session.id}`);
      return true;
    } catch (e) {
      logger.error(`Failed to sync session to Firebase:`, {
        error: String(e),
      });
      return false;
    }
  }

  // Delete a session from Firebase
  async deleteSession(sessionId: string): Promise<boolean> {
    if (!this.isEnabled()) return false;

    try {
      const url = `${this.dbUrl}/sessions/${sessionId}.json`;
      logger.info(`Deleting session from Firebase: ${sessionId}`);

      const res = await fetch(url, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(`Firebase returned status ${res.status}`);
      }

      logger.info(`Session deleted from cloud: ${sessionId}`);
      return true;
    } catch (e) {
      logger.error(`Failed to delete session from Firebase:`, {
        error: String(e),
      });
      return false;
    }
  }

  // Load all sessions from Firebase during page hydration
  async fetchSessions(): Promise<ChatSession[] | null> {
    if (!this.isEnabled()) return null;

    try {
      const url = `${this.dbUrl}/sessions.json`;
      logger.info("Fetching remote sessions from Firebase cloud...");

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Firebase fetch returned status ${res.status}`);
      }

      const data = await res.json();
      if (!data) return [];

      // Convert database map back into ordered array
      const list: ChatSession[] = Object.keys(data).map((key) => {
        const item = data[key];
        return {
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        };
      });

      // Sort by last updated
      return list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (e) {
      logger.error("Failed to retrieve sessions from Firebase:", {
        error: String(e),
      });
      return null;
    }
  }
}

export const firebaseSyncService = new FirebaseSyncService();
export default firebaseSyncService;
