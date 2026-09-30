import { ID, Query } from 'appwrite';
import { databases, client, DATABASE_ID, USERS_COLLECTION_ID, MESSAGES_COLLECTION_ID } from './appwrite';
import { AppwriteUser, ChatMessage } from './types';

export async function fetchAllUsers(): Promise<AppwriteUser[]> {
  try {
    const response = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
      Query.limit(100),
    ]);
    return response.documents.map((doc) => ({
      $id: doc.$id,
      userId: doc.userId,
      name: doc.name,
      email: doc.email,
      $createdAt: doc.$createdAt,
    }));
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return [];
  }
}

export async function fetchAllRecentMessages(): Promise<ChatMessage[]> {
  try {
    const response = await databases.listDocuments(DATABASE_ID, MESSAGES_COLLECTION_ID, [
      Query.orderDesc('$createdAt'),
      Query.limit(100),
    ]);

    return response.documents.map((doc) => ({
      $id: doc.$id,
      senderId: doc.senderId,
      receiverId: doc.receiverId,
      senderName: doc.senderName || 'Anonymous',
      text: doc.text,
      $createdAt: doc.$createdAt,
    }));
  } catch (error) {
    console.error('Failed to fetch recent messages:', error);
    return [];
  }
}

export async function fetchConversationMessages(
  currentUserId: string,
  targetUserId: string
): Promise<ChatMessage[]> {
  try {
    // Fetch recent messages and filter for the 1-to-1 conversation pair
    const response = await databases.listDocuments(DATABASE_ID, MESSAGES_COLLECTION_ID, [
      Query.orderAsc('$createdAt'),
      Query.limit(100),
    ]);

    const messages: ChatMessage[] = response.documents
      .map((doc) => ({
        $id: doc.$id,
        senderId: doc.senderId,
        receiverId: doc.receiverId,
        senderName: doc.senderName || 'Anonymous',
        text: doc.text,
        $createdAt: doc.$createdAt,
      }))
      .filter(
        (msg) =>
          (msg.senderId === currentUserId && msg.receiverId === targetUserId) ||
          (msg.senderId === targetUserId && msg.receiverId === currentUserId)
      );

    return messages;
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    return [];
  }
}

export async function sendChatMessage(
  senderId: string,
  receiverId: string,
  senderName: string,
  text: string
): Promise<ChatMessage | null> {
  if (!text.trim()) return null;

  try {
    const doc = await databases.createDocument(
      DATABASE_ID,
      MESSAGES_COLLECTION_ID,
      ID.unique(),
      {
        senderId,
        receiverId,
        senderName,
        text: text.trim(),
      }
    );

    return {
      $id: doc.$id,
      senderId: doc.senderId,
      receiverId: doc.receiverId,
      senderName: doc.senderName,
      text: doc.text,
      $createdAt: doc.$createdAt,
    };
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

export function subscribeToRealtimeMessages(onMessageReceived: (message: ChatMessage) => void) {
  const channel = `databases.${DATABASE_ID}.collections.${MESSAGES_COLLECTION_ID}.documents`;

  const unsubscribe = client.subscribe(channel, (response) => {
    // Check if event is create
    if (
      response.events.some(
        (event) =>
          event.endsWith('.documents.create') || event.endsWith('.create')
      )
    ) {
      const doc = response.payload as Record<string, any>;
      const newMsg: ChatMessage = {
        $id: doc.$id,
        senderId: doc.senderId,
        receiverId: doc.receiverId,
        senderName: doc.senderName || 'Anonymous',
        text: doc.text,
        $createdAt: doc.$createdAt,
      };
      onMessageReceived(newMsg);
    }
  });

  return unsubscribe;
}
