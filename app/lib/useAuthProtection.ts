"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';

const useAuthProtection = () => {
    const { user, isLoading, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.replace('/login');
        }
    }, [user, isLoading, router]);

    return { isLoading, user, logout };
};

export default useAuthProtection;
