import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

// === Configuration ===
const LAYOUT_VERSION = "4.3"; // Updated Bottom Right to X:1599, Y:2681
const STORAGE_KEY_VERSION = "badge_layout_version";
const STORAGE_KEY = "badge_layout_data_v1"; // Main layout storage key

// Initial Elements (Free Form)
// We use UUIDs now for true dynamic capability
const DEFAULT_ELEMENTS = [
    // TOP LEFT (rotation: 90° clockwise)
    { id: uuidv4(), type: 'text', content: 'Nome Sobrenome', x: 944, y: 887, rotation: 90, max_w: 1800, max_h: 400, max_font_size: 120 },

    // BOTTOM LEFT (rotation: 90° clockwise)
    { id: uuidv4(), type: 'text', content: 'Nome Sobrenome', x: 944, y: 2605, rotation: 90, max_w: 1800, max_h: 400, max_font_size: 120 },

    // TOP RIGHT (rotation: -90° counter-clockwise)
    { id: uuidv4(), type: 'text', content: 'Nome Sobrenome', x: 1613, y: 969, rotation: -90, max_w: 1800, max_h: 400, max_font_size: 120 },

    // BOTTOM RIGHT (rotation: -90° counter-clockwise)
    { id: uuidv4(), type: 'text', content: 'Nome Sobrenome', x: 1613, y: 2681, rotation: -90, max_w: 1800, max_h: 400, max_font_size: 120 }
];

const initialState = {
    history: {
        past: [],
        present: DEFAULT_ELEMENTS,
        future: []
    },
    selectedIds: [],
    testName: "Nome Sobrenome",
    mode: 'names'  // Start with Names page as entry point
};

const EditorContext = createContext();

const editorReducer = (state, action) => {
    switch (action.type) {
        case 'UPDATE_ELEMENT':
            // Mirroring Logic: Detect if content is being updated and sync with pair
            const currentElement = state.history.present.find(el => el.id === action.id);
            const isContentUpdate = action.payload.hasOwnProperty('content');

            let updatedElements = state.history.present.map(el =>
                el.id === action.id ? { ...el, ...action.payload } : el
            );

            // Auto-sync content with paired element if content changed
            if (isContentUpdate && currentElement) {
                const currentIndex = state.history.present.findIndex(el => el.id === action.id);

                // Determine pair based on position in array:
                // [0] Top Left ↔ [2] Top Right
                // [1] Bottom Left ↔ [3] Bottom Right
                let pairedIndex = -1;

                if (currentIndex === 0) pairedIndex = 2;      // Top Left → Top Right
                else if (currentIndex === 2) pairedIndex = 0; // Top Right → Top Left
                else if (currentIndex === 1) pairedIndex = 3; // Bottom Left → Bottom Right
                else if (currentIndex === 3) pairedIndex = 1; // Bottom Right → Bottom Left

                // Apply mirroring
                if (pairedIndex !== -1 && updatedElements[pairedIndex]) {
                    updatedElements = updatedElements.map((el, idx) =>
                        idx === pairedIndex ? { ...el, content: action.payload.content } : el
                    );
                }
            }

            return {
                ...state,
                history: {
                    past: [...state.history.past, state.history.present],
                    present: updatedElements,
                    future: []
                }
            };

        case 'ADD_ELEMENT':
            const newElement = {
                id: uuidv4(),
                type: 'text',
                content: 'New Text',
                x: 1240, // Center
                y: 1754, // Center
                rotation: 0,
                max_w: 1000,
                max_h: 200,
                fontSize: 160,
                ...action.payload
            };
            return {
                ...state,
                history: {
                    past: [...state.history.past, state.history.present],
                    present: [...state.history.present, newElement],
                    future: []
                }
            };

        case 'DELETE_ELEMENTS':
            const remaining = state.history.present.filter(el => !action.ids.includes(el.id));
            return {
                ...state,
                history: {
                    past: [...state.history.past, state.history.present],
                    present: remaining,
                    future: []
                },
                selectedIds: []
            };

        case 'SELECT_ELEMENT':
            let newSelected = [];
            if (action.multi) {
                if (state.selectedIds.includes(action.id)) {
                    newSelected = state.selectedIds.filter(id => id !== action.id);
                } else {
                    newSelected = [...state.selectedIds, action.id];
                }
            } else {
                newSelected = action.id === -1 ? [] : [action.id];
            }
            return { ...state, selectedIds: newSelected };

        case 'UNDO':
            if (state.history.past.length === 0) return state;
            const previous = state.history.past[state.history.past.length - 1];
            const newPast = state.history.past.slice(0, -1);
            return {
                ...state,
                history: {
                    past: newPast,
                    present: previous,
                    future: [state.history.present, ...state.history.future]
                }
            };

        case 'REDO':
            if (state.history.future.length === 0) return state;
            const next = state.history.future[0];
            const newFuture = state.history.future.slice(1);
            return {
                ...state,
                history: {
                    past: [...state.history.past, state.history.present],
                    present: next,
                    future: newFuture
                }
            };

        case 'RESET_ALL':
            return { ...initialState, history: { ...initialState.history, present: DEFAULT_ELEMENTS } };

        case 'SET_MODE':
            return { ...state, mode: action.payload };

        case 'SET_TEST_NAME':
            return { ...state, testName: action.payload };

        default:
            return state;
    }
};

export const EditorProvider = ({ children }) => {
    const [state, dispatch] = useReducer(editorReducer, initialState);

    // Auto-Reset on Version Change
    useEffect(() => {
        const savedVersion = localStorage.getItem(STORAGE_KEY_VERSION);
        if (savedVersion !== LAYOUT_VERSION) {
            console.log(`Version Mismatch (${savedVersion} vs ${LAYOUT_VERSION}). Forcing Reset.`);
            dispatch({ type: 'RESET_ALL' });
            localStorage.setItem(STORAGE_KEY_VERSION, LAYOUT_VERSION);
        }
    }, []);

    // Helper Actions
    const updateElement = (id, payload) => dispatch({ type: 'UPDATE_ELEMENT', id, payload });
    const selectElement = (id, multi = false) => dispatch({ type: 'SELECT_ELEMENT', id, multi });
    const addElement = (payload) => dispatch({ type: 'ADD_ELEMENT', payload });
    const deleteElements = (ids) => dispatch({ type: 'DELETE_ELEMENTS', ids });

    const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
    const redo = useCallback(() => dispatch({ type: 'REDO' }), []);
    const setMode = (mode) => dispatch({ type: 'SET_MODE', payload: mode });
    const setTestName = (name) => dispatch({ type: 'SET_TEST_NAME', payload: name });

    // Layout Persistence
    const saveLayout = useCallback(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state.history.present));
            return true;
        } catch (e) {
            console.error("Save failed", e);
            return false;
        }
    }, [state.history.present]);

    const resetLayout = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        // We need a specific action to reset to defaults in reducer or just reload
        // Since we have RESET_ALL, let's use that but ensure it uses DEFAULT_ELEMENTS
        dispatch({ type: 'RESET_ALL' });
    }, []);

    const value = {
        elements: state.history.present,
        selectedIds: state.selectedIds,
        mode: state.mode,
        testName: state.testName,
        updateElement,
        selectElement,
        addElement,
        deleteElements,
        undo,
        redo,
        setMode,
        setTestName,
        saveLayout,   // Added
        resetLayout,  // Added
        past: state.history.past,
        future: state.history.future
    };

    return (
        <EditorContext.Provider value={value}>
            {children}
        </EditorContext.Provider>
    );
};

export const useEditor = () => {
    const context = useContext(EditorContext);
    if (!context) throw new Error("useEditor must be used within EditorProvider");
    return context;
};
