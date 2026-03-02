import { useState, useEffect, useRef } from 'react';
import { ref, onValue, set, onDisconnect, serverTimestamp } from 'firebase/database';
import { database } from '../firebase';
import { generateId } from '../utils';

export function useSharedSession(currentState: any) {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [clientId] = useState(() => generateId());
    const [isConnected, setIsConnected] = useState(false);
    const [lockedBy, setLockedBy] = useState<string | null>(null);

    const onUpdateRef = useRef<((state: any) => void) | null>(null);

    // Parse session from URL on load
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const session = params.get('session');
        if (session) {
            setSessionId(session);
        }
    }, []);

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
                setIsConnected(true);
                setLockedBy(data.lockedBy || null);

                // If someone else is locking it, or no one is locking it, consume their state
                if (data.lockedBy !== clientId) {
                    if (onUpdateRef.current && data.state) {
                        onUpdateRef.current(data.state);
                    }
                }
            }
        });

        return () => {
            unsubscribe();
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
        setOnStateUpdate: (callback: (state: any) => void) => {
            onUpdateRef.current = callback;
        }
    };
}
