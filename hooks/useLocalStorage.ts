/**
 * useLocalStorage.ts — Hook para sincronizar estado com localStorage
 *
 * useState com persistência automática:
 * - Lê o valor inicial do localStorage na montagem
 * - Grava cada novo valor automaticamente
 * - Retorna [value, setter] exatamente como useState
 */

import { useState, useEffect, Dispatch, SetStateAction } from 'react';

export function useLocalStorage<T>(
    key: string,
    defaultValue: T
): [T, Dispatch<SetStateAction<T>>] {
    const [value, setValue] = useState<T>(() => {
        try {
            const stored = localStorage.getItem(key);
            if (stored === null) return defaultValue;
            return JSON.parse(stored) as T;
        } catch {
            return defaultValue;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {
            // localStorage cheio ou desabilitado — ignora silenciosamente
        }
    }, [key, value]);

    return [value, setValue];
}
