"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/lib/AuthContext';
import { Turnstile } from '@marsidev/react-turnstile';
import { toast } from "sonner"
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';

export default function LoginPage() {
    const [username, setUsername] = useState('admin');
    const [password, setPassword] = useState('admin');
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!turnstileToken) {
            toast.error("Please complete the security check.");
            return;
        }
        setIsLoading(true);
        try {
            await login(username, password, turnstileToken);
            toast.success("Login successful!");
            router.push('/');
        } catch (error: any) {
            toast.error(error.message || 'Login failed.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="flex items-center justify-center min-h-screen bg-background bg-grid-pattern bg-grid-size">
            <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-background [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
            <Card className="w-full max-w-sm bg-black/30 backdrop-blur-xl border-white/10 text-white z-10">
                <CardHeader>
                    <CardTitle className="text-2xl">Engineering Studio</CardTitle>
                    <CardDescription>Enter your credentials to access your AI workspace.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="admin"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="bg-gray-800/50 border-white/20"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="bg-gray-800/50 border-white/20"
                            />
                        </div>
                        <div className="flex justify-center pt-2">
                          <Turnstile
                              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
                              onSuccess={setTurnstileToken}
                              options={{ theme: 'dark' }}
                          />
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading || !turnstileToken}>
                            {isLoading ? 'Signing In...' : 'Sign In'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </main>
    );
}
