import { useState, useEffect, useRef } from 'react';
import { ref, onValue, set, onDisconnect, serverTimestamp } from 'firebase/database';
import { database } from '../firebase';
import { generateId } from '../utils';

export function useSharedSession(currentState: any) {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [clientId] = useState(() => {
        let saved = localStorage.getItem('splitbill_uid');
        if (!saved) {
            saved = generateId();
            localStorage.setItem('splitbill_uid', saved);
        }
        return saved;
    });
    const [isConnected, setIsConnected] = useState(false);
    const [lockedBy, setLockedBy] = useState<string | null>(null);
    const [activeUsers, setActiveUsers] = useState<{ uid: string, name: string, color: string }[]>([]);

    const onUpdateRef = useRef<((state: any) => void) | null>(null);

    // Parse session from URL on load
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const session = params.get('session');
        if (session) {
            setSessionId(session);
        }
    }, []);

    // Track session history
    useEffect(() => {
        if (sessionId) {
            try {
                const historyStr = localStorage.getItem('splitbill_history');
                let history: { id: string; timestamp: number }[] = historyStr ? JSON.parse(historyStr) : [];
                history = history.filter(h => h.id !== sessionId);
                history.unshift({ id: sessionId, timestamp: Date.now() });
                if (history.length > 5) history = history.slice(0, 5);
                localStorage.setItem('splitbill_history', JSON.stringify(history));
            } catch (e) {
                console.error("Failed to save session history", e);
            }
        }
    }, [sessionId]);

    // Sync with Firebase
    useEffect(() => {
        if (!sessionId) return;

        const sessionRef = ref(database, `sessions/${sessionId}`);
        const lockRef = ref(database, `sessions/${sessionId}/lockedBy`);

        // Setup disconnect hook to release lock
        onDisconnect(lockRef).remove();

        const unsubscribe = onValue(sessionRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                if (data.createdAt && typeof data.createdAt === 'number') {
                    const ageMs = Date.now() - data.createdAt;
                    if (ageMs > 24 * 60 * 60 * 1000) {
                        set(sessionRef, null);
                        alert('Sesi ini sudah lebih dari 24 jam dan telah dihapus dari cloud demi keamanan.');
                        window.location.href = window.location.pathname;
                        return;
                    }
                }

                setIsConnected(true);
                setLockedBy(data.lockedBy || null);

                // If someone else is locking it, or no one is locking it, consume their state
                if (data.lockedBy !== clientId) {
                    if (onUpdateRef.current && data.state) {
                        onUpdateRef.current(data.state);
                    }
                }
            } else {
                // If data is suddenly null (wiped by owner or expired)
                if (isConnected) {
                    alert('Sesi ini telah dihapus atau kedaluwarsa.');
                    window.location.href = window.location.pathname;
                }
            }
        });

        // Sync Presence
        const presenceListRef = ref(database, `sessions/${sessionId}/presence`);
        const unsubPresence = onValue(presenceListRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const users = Object.entries(data).map(([uid, val]: any) => ({
                    uid,
                    name: val.name,
                    color: val.color
                }));
                setActiveUsers(users);
            } else {
                setActiveUsers([]);
            }
        });

        return () => {
            unsubscribe();
            unsubPresence();
            onDisconnect(lockRef).cancel(); // cleanup
        };
    }, [sessionId, clientId]);

    // Publish state when WE hold the lock
    useEffect(() => {
        if (sessionId && lockedBy === clientId) {
            const stateRef = ref(database, `sessions/${sessionId}/state`);
            set(stateRef, currentState);
        }
    }, [currentState, sessionId, lockedBy, clientId]);

    const createSession = async () => {
        const newSessionId = generateId();
        const sessionRef = ref(database, `sessions/${newSessionId}`);

        await set(sessionRef, {
            createdAt: serverTimestamp(),
            lockedBy: clientId,
            state: currentState
        });

        // Update URL
        const url = new URL(window.location.href);
        url.searchParams.set('session', newSessionId);
        window.history.pushState({}, '', url);

        setSessionId(newSessionId);
    };

    const takeLock = () => {
        if (!sessionId) return;
        const lockRef = ref(database, `sessions/${sessionId}/lockedBy`);
        set(lockRef, clientId);
    };

    const releaseLock = () => {
        if (!sessionId) return;
        const lockRef = ref(database, `sessions/${sessionId}/lockedBy`);
        set(lockRef, null);
    };

    const joinSessionPresence = (name: string, color: string) => {
        if (!sessionId) return;
        const presenceRef = ref(database, `sessions/${sessionId}/presence/${clientId}`);
        set(presenceRef, { name, color, lastSeen: serverTimestamp() });
        onDisconnect(presenceRef).remove();
    };

    return {
        sessionId,
        clientId,
        isConnected,
        lockedBy,
        isLockedByMe: lockedBy === clientId,
        isLockedByOther: lockedBy !== null && lockedBy !== clientId,
        createSession,
        takeLock,
        releaseLock,
        joinSessionPresence,
        activeUsers,
        setOnStateUpdate: (callback: (state: any) => void) => {
            onUpdateRef.current = callback;
        }
    };
}
