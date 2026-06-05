'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSWRConfig } from 'swr';
import { Message, Contact } from '@prisma/client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

/**
 * Custom hook to manage client WebSocket connections.
 * Automatically synchronizes incoming events with the local SWR caching layer.
 */
export function useWebSocket(activeOrgId: string | undefined, selectedContactId: string | null) {
  const { mutate } = useSWRConfig();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!activeOrgId) return;

    // Establish credentials-enabled connection to WebSocket server
    const socket = io(WS_URL, {
      withCredentials: true,
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✓ Connected to Real-time WebSockets Server');
    });

    // Listen for new messages
    socket.on('message:new', (newMsg: Message) => {
      // 1. If the message belongs to the active contact, append it to the message list SWR cache
      if (selectedContactId && newMsg.contactId === selectedContactId) {
        mutate(
          `/api/messages?contactId=${selectedContactId}&limit=20`,
          (currentMessages: any[] = []) => {
            if (currentMessages.some((m) => m.id === newMsg.id)) return currentMessages;
            return [...currentMessages, newMsg];
          },
          false // Skip HTTP refetch since we already have the new message data
        );
      }

      // 2. Refresh the contacts list cache to update snippets and unread status
      mutate(`/api/contacts?platform=ALL`);
    });

    // Listen for message updates (like reactions or status changes)
    socket.on('message:updated', (updatedMsg: Message) => {
      if (selectedContactId && updatedMsg.contactId === selectedContactId) {
        mutate(
          `/api/messages?contactId=${selectedContactId}&limit=20`,
          (currentMessages: any[] = []) => {
            return currentMessages.map(m => m.id === updatedMsg.id ? updatedMsg : m);
          },
          false
        );
      }
      mutate(`/api/contacts?platform=ALL`);
    });

    // Listen for contact updates (such as name overrides or snooze toggle)
    socket.on('contact:updated', (updatedContact: Contact) => {
      mutate(`/api/contacts?platform=ALL`);
    });

    socket.on('disconnect', (reason) => {
      console.warn(`🔌 WebSockets disconnected: ${reason}`);
    });

    return () => {
      socket.disconnect();
    };
  }, [activeOrgId, selectedContactId, mutate]);

  return socketRef.current;
}
