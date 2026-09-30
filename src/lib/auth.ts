import { ID, Query } from 'appwrite';
import { account, databases, DATABASE_ID, USERS_COLLECTION_ID } from './appwrite';
import { UserAuth } from './types';

export async function getCurrentUser(): Promise<UserAuth | null> {
  try {
    const session = await account.get();
    return {
      $id: session.$id,
      name: session.name,
      email: session.email,
    };
  } catch {
    return null;
  }
}

export async function signup(email: string, password: string, name: string) {
  const userAccount = await account.create(ID.unique(), email, password, name);
  await account.createEmailPasswordSession(email, password);
  await syncUserProfile(userAccount.$id, name, email);
  return userAccount;
}

export async function login(email: string, password: string) {
  const session = await account.createEmailPasswordSession(email, password);
  const user = await account.get();
  await syncUserProfile(user.$id, user.name, user.email);
  return session;
}

export async function logout() {
  try {
    await account.deleteSession('current');
  } catch (error) {
    console.error('Logout error:', error);
  }
}

export async function syncUserProfile(userId: string, name: string, email: string) {
  try {
    // Check if user record already exists in database
    const existing = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
      Query.equal('userId', userId),
    ]);

    if (existing.total === 0) {
      await databases.createDocument(DATABASE_ID, USERS_COLLECTION_ID, ID.unique(), {
        userId,
        name,
        email,
      });
    }
  } catch (error) {
    console.warn('Could not sync user profile to database:', error);
  }
}
