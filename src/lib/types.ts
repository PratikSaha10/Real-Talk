export interface AppwriteUser {
  $id: string;
  userId: string;
  name: string;
  email: string;
  $createdAt?: string;
}

export interface ChatMessage {
  $id: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  text: string;
  $createdAt: string;
  status?: 'sending' | 'sent' | 'error';
}

export interface UserAuth {
  $id: string;
  name: string;
  email: string;
}
