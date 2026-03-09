import { useState, useEffect, useRef, useCallback } from 'react';
import { ref, onValue, set, remove, onDisconnect, serverTimestamp } from 'firebase/database';
import { database } from '../firebase';
import { generateId } from '../utils';
import { AppState } from '../types';

export function useSharedSession(currentState: AppState) {
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
    const [incomingState, setIncomingState] = useState<AppState | null>(null);
    const [sessionNotFound, setSessionNotFound] = useState(false);

    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isCreator = useRef(false);

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

    // Listen: session state (other user's edits)
    useEffect(() => {
        if (!sessionId) return;
        const stateRef = ref(database, `sessions/${sessionId}/state`);
        const unsub = onValue(stateRef, (snapshot) => {
            const data = snapshot.val();
            if (data && lockedBy && lockedBy !== clientId) {
                setIncomingState(data as AppState);
            }
        });
        return () => unsub();
    }, [sessionId, clientId, lockedBy]);

    // Listen: users presence
    useEffect(() => {
        if (!sessionId) return;
        const usersRef = ref(database, `sessions/${sessionId}/users`);
        const unsub = onValue(usersRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setActiveUsers(Object.values(data) as { uid: string, name: string, color: string }[]);
            }
        });
        return () => unsub();
    }, [sessionId]);

    // Listen: lockedBy + session existence
    useEffect(() => {
        if (!sessionId) return;
        const lockRef = ref(database, `sessions/${sessionId}/lockedBy`);
        const metaRef = ref(database, `sessions/${sessionId}/createdAt`);

        // Check if session exists
        const unsubMeta = onValue(metaRef, (snapshot) => {
            if (!snapshot.exists() && !isCreator.current) {
                setSessionNotFound(true);
                setIsConnected(false);
            } else if (snapshot.exists()) {
                // Check expiry (24h)
                const createdAt = snapshot.val();
                if (typeof createdAt === 'number') {
                    const ageMs = Date.now() - createdAt;
                    if (ageMs > 24 * 60 * 60 * 1000) {
                        setSessionNotFound(true);
                        setIsConnected(false);
                        return;
                    }
                }
                setIsConnected(true);
                setSessionNotFound(false);
            }
        });

        const unsubLock = onValue(lockRef, (snapshot) => {
            setLockedBy(snapshot.val() || null);
        });

        // Release lock on disconnect
        onDisconnect(lockRef).remove();

        return () => {
            unsubMeta();
            unsubLock();
        };
    }, [sessionId]);

    // Push state to Firebase (debounced 400ms), strip receiptImage from bills
    useEffect(() => {
        if (!sessionId || !isConnected) return;
        if (lockedBy && lockedBy !== clientId) return;

        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            // Strip image data before writing to Firebase
            const sanitizedState: AppState = {
                ...currentState,
                bills: currentState.bills.map(b => {
                    const { image: _image, ...rest } = b as any;
                    return rest;
                }),
            };

            const stateRef = ref(database, `sessions/${sessionId}/state`);
            const updatedAtRef = ref(database, `sessions/${sessionId}/updatedAt`);
            set(stateRef, sanitizedState);
            set(updatedAtRef, serverTimestamp());
        }, 400);

        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, [currentState, sessionId, isConnected, lockedBy, clientId]);

    const createSession = async (initialState: AppState, personName: string, personColor: string) => {
        const newSessionId = generateId();
        isCreator.current = true;

        const sanitizedState: AppState = {
            ...initialState,
            bills: initialState.bills.map(b => {
                const { image: _image, ...rest } = b as any;
                return rest;
            }),
        };

        const sessionRef = ref(database, `sessions/${newSessionId}`);
        await set(sessionRef, {
            state: sanitizedState,
            lockedBy: clientId,
            createdAt: Date.now(),
            updatedAt: serverTimestamp(),
            users: {
                [clientId]: { uid: clientId, name: personName, color: personColor }
            }
        });
        setSessionId(newSessionId);
        setIsConnected(true);
        const url = new URL(window.location.href);
        url.searchParams.set('session', newSessionId);
        window.history.pushState({}, '', url);
        return newSessionId;
    };

    const joinSession = async (targetSessionId: string, personName: string, personColor: string) => {
        const userRef = ref(database, `sessions/${targetSessionId}/users/${clientId}`);
        await set(userRef, { uid: clientId, name: personName, color: personColor });
        setSessionId(targetSessionId);
        const url = new URL(window.location.href);
        url.searchParams.set('session', targetSessionId);
        window.history.pushState({}, '', url);
    };

    const joinSessionPresence = async (personName: string, personColor: string) => {
        if (!sessionId) return;
        const userRef = ref(database, `sessions/${sessionId}/users/${clientId}`);
        await set(userRef, { uid: clientId, name: personName, color: personColor });
        onDisconnect(userRef).remove();
    };

    const releaseLock = async () => {
        if (!sessionId) return;
        const lockRef = ref(database, `sessions/${sessionId}/lockedBy`);
        await remove(lockRef);
    };

    const acquireLock = async () => {
        if (!sessionId) return;
        const lockRef = ref(database, `sessions/${sessionId}/lockedBy`);
        await set(lockRef, clientId);
    };

    const isLockedByMe = lockedBy === clientId;
    const isLockedByOther = !!lockedBy && lockedBy !== clientId;

    return {
        sessionId,
        clientId,
        isConnected,
        lockedBy,
        isLockedByMe,
        isLockedByOther,
        activeUsers,
        incomingState,
        sessionNotFound,
        createSession,
        joinSession,
        joinSessionPresence,
        releaseLock,
        acquireLock,
    };
}
