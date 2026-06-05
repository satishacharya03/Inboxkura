export type AgentChatMessage = {
  role: 'user' | 'model';
  parts: [{ text: string }];
};

const DB_NAME = 'InboxKuraLocalDB';
const DB_VERSION = 2;
const STORE_NAME = 'agentChats';

export type MessageAiInsight = {
  messageId: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated';
  category: 'support' | 'sales' | 'general';
  analysis: string;
  suggestedReplies: string[];
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in browser environments.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open local IndexedDB database');
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'contactId' });
      }
      if (!db.objectStoreNames.contains('messageAiInsights')) {
        db.createObjectStore('messageAiInsights', { keyPath: 'messageId' });
      }
    };
  });
}

/**
 * Retrieves the stored AI copilot chat history for a specific contact ID.
 */
export async function getLocalAgentChat(contactId: string): Promise<AgentChatMessage[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(contactId);

      request.onsuccess = () => {
        if (request.result && Array.isArray(request.result.chat)) {
          resolve(request.result.chat);
        } else {
          resolve([]);
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error reading from IndexedDB:', error);
    return [];
  }
}

/**
 * Persists the AI copilot chat history for a specific contact ID.
 */
export async function saveLocalAgentChat(contactId: string, chat: AgentChatMessage[]): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ contactId, chat, updatedAt: new Date().toISOString() });

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error writing to IndexedDB:', error);
  }
}

/**
 * Retrieves local AI insights for a specific message.
 */
export async function getLocalMessageAi(messageId: string): Promise<MessageAiInsight | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('messageAiInsights', 'readonly');
      const store = transaction.objectStore('messageAiInsights');
      const request = store.get(messageId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error reading message AI from IndexedDB:', error);
    return null;
  }
}

/**
 * Saves AI insights locally for a specific message.
 */
export async function saveLocalMessageAi(insight: MessageAiInsight): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('messageAiInsights', 'readwrite');
      const store = transaction.objectStore('messageAiInsights');
      const request = store.put(insight);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error writing message AI to IndexedDB:', error);
  }
}
