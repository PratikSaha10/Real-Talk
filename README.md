# 💬 RealTalk — Real-Time Chat Application

A modern, real-time 1-on-1 chat application built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Appwrite** (Auth, Databases & Realtime).

---

## 🚀 Features

- 🔐 **Authentication**: User Signup, Login, and Logout using Appwrite Auth.
- 🔒 **Protected Chat Route**: Automatic authentication guards redirect unauthenticated users away from `/chat`.
- 👥 **User Discovery**: Lists all registered users in a searchable sidebar for 1-on-1 conversations.
- 💬 **1-on-1 Messaging**: Filtered, real-time conversation history between the logged-in user and a selected contact.
- ⚡ **Real-Time Sync**: Instant message delivery powered by Appwrite Realtime subscriptions — no polling required.
- 🔔 **Unread Message Counters**: Badge counters on each contact in the sidebar showing how many unread messages have arrived since the conversation was last viewed. Persisted via `localStorage` so counts survive page refreshes.
- ⏳ **Optimistic UI & Message Status**: Messages appear instantly with a **sending** (clock spinner) → **sent** (✓ checkmark) status flow for immediate feedback.
- 🔁 **Retry on Failure**: If message delivery fails (e.g. no network), the bubble turns red with a **Retry** button so users can resend without retyping.
- 🧹 **Deduplication**: Smart logic prevents duplicate messages when the Appwrite Realtime event and the API success response arrive simultaneously.
- 📜 **Auto-scroll**: Automatically scrolls to the newest message in the conversation.
- 📱 **Responsive UI**: Mobile-friendly design with a collapsible sidebar drawer.

---

## 🛠️ Tech Stack

| Layer              | Technology                                        |
| ------------------ | ------------------------------------------------- |
| **Framework**      | Next.js 14 (App Router)                           |
| **Language**       | TypeScript                                        |
| **Styling**        | Tailwind CSS                                      |
| **Icons**          | Lucide React                                      |
| **Backend / BaaS** | Appwrite Cloud (Auth, Databases, Realtime)        |
| **Deployment**     | Vercel                               |

---

## 📁 Project Structure

```
chat-app/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Landing page (redirects logged-in users to /chat)
│   │   ├── login/page.tsx    # Login form
│   │   ├── signup/page.tsx   # Signup form
│   │   ├── chat/page.tsx     # Main chat interface (protected)
│   │   ├── layout.tsx        # Root layout with AuthProvider
│   │   └── globals.css       # Global styles & chat wallpaper pattern
│   ├── context/
│   │   └── AuthContext.tsx    # Auth context (login, signup, logout, session)
│   └── lib/
│       ├── appwrite.ts       # Appwrite Client, Account, Databases setup
│       ├── chat.ts           # Chat helpers (fetch users, messages, send, subscribe)
│       └── types.ts          # TypeScript interfaces (AppwriteUser, ChatMessage, UserAuth)
├── .env.local                # Environment variables (not committed)
├── tailwind.config.ts        # Tailwind config with custom theme tokens
├── package.json
└── README.md
```

---

## ⚙️ Appwrite Backend Setup Instructions

To run this application, first configure your Appwrite backend:

### 1. Create Appwrite Project
1. Log in to [Appwrite Cloud](https://cloud.appwrite.io/).
2. Create a new project named **`Real-Time Chat App`**.
3. Copy your **Project ID** and **API Endpoint** (`https://cloud.appwrite.io/v1`).

### 2. Configure Database & Collections
1. Go to **Databases** in the Appwrite console and create a new database: **`chat_db`**.

2. Create Collection 1: **`users`**
   - **Permissions**: Add role `Any` or `Users` with **Read** and **Create** permissions.
   - **Attributes**:
     - `userId` (string, size 255, required)
     - `name` (string, size 255, required)
     - `email` (string, size 255, required)

3. Create Collection 2: **`messages`**
   - **Permissions**: Add role `Any` or `Users` with **Read** and **Create** permissions.
   - **Attributes**:
     - `senderId` (string, size 255, required)
     - `receiverId` (string, size 255, required)
     - `senderName` (string, size 255, required)
     - `text` (string, size 5000, required)

---

## 💻 Local Development Setup

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/<USERNAME>/<REPO>.git
cd <REPO>
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and fill in your Appwrite credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_APPWRITE_DATABASE_ID=chat_db
NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID=users
NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID=messages
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000] in your browser.

---

## 📦 Production Build

```bash
npm run build
npm run start
```

---

## 🌐 Deploying to Vercel

1. Push code to your GitHub repository.
2. Import repository in [Vercel](https://vercel.com).
3. Set the Environment Variables (`NEXT_PUBLIC_APPWRITE_*`) in Vercel project settings.
4. Deploy!
5. In Appwrite Console under **Settings > Web Platforms**, add your Vercel deployment domain (e.g. `your-app.vercel.app`).

---

## 🧪 Testing the Error / Retry Flow

Since the app communicates **directly with Appwrite Cloud** from the browser, stopping the Next.js dev server won't break messaging on an already-loaded tab. To test the retry feature:

1. Open the chat in your browser.
2. Open **DevTools → Network** tab → check the **Offline** checkbox.
3. Send a message — it will show a red bubble with a **Retry** button.
4. Uncheck Offline → click **Retry** → message delivers successfully.

---

## 📄 License

This project is for educational / assignment purposes.
