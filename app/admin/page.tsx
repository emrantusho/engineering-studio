"use client";
import { useEffect, useState } from 'react';
import { toast } from "sonner";
import { Switch } from "@/app/components/ui/switch";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from '@/app/components/ui/button';
import { useApi } from '@/app/lib/api';

type Settings = { [key: string]: string };

const KEY_PROVIDERS = ['turnstile', 'github', 'openai', 'anthropic', 'gemini', 'deepseek'];

export default function AdminPage() {
    const [settings, setSettings] = useState<Settings>({});
    const [apiKeys, setApiKeys] = useState<{ [key: string]: string }>({});
    const [keysPresent, setKeysPresent] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const api = useApi();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [settingsData, keysData] = await Promise.all([
                    api.get<Settings>('/admin/settings'),
                    api.get<string[]>('/admin/keys')
                ]);
                setSettings(settingsData);
                setKeysPresent(keysData);
            } catch (error) {
                toast.error("Failed to load initial data.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleSettingChange = async (key: string, value: string | boolean) => {
        const stringValue = String(value);
        const originalValue = settings[key];
        setSettings(prev => ({ ...prev, [key]: stringValue }));
        try {
            await api.put('/admin/settings', { key, value: stringValue });
            toast.success(`Setting '${key}' updated.`);
        } catch (error) {
            setSettings(prev => ({ ...prev, [key]: originalValue }));
            toast.error(`Failed to update setting '${key}'.`);
        }
    };

    const handleApiKeySave = async (provider_id: string) => {
        const api_key = apiKeys[provider_id] || '';
        if (api_key.startsWith('••••') && api_key.endsWith('••••')) {
            toast.info("Key has not been changed.");
            return;
        }
        try {
            await api.put('/admin/keys', { provider_id, api_key });
            toast.success(`API Key for ${provider_id} saved.`);
            if (api_key !== '') {
                // THE FIX IS HERE: Use a more compatible way to ensure uniqueness
                setKeysPresent(prev => {
                    if (prev.includes(provider_id)) {
                        return prev;
                    }
                    return [...prev, provider_id];
                });
                setApiKeys(prev => ({ ...prev, [provider_id]: '' }));
            } else {
                 setKeysPresent(prev => prev.filter(k => k !== provider_id));
            }
        } catch (error: any) {
            toast.error(`Failed to save key: ${error.message}`);
        }
    };

    if (isLoading) return <div>Loading settings...</div>;

    return (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card>
                <CardHeader><CardTitle>General Settings</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                        <Label htmlFor="auto-dev-mode">Auto-Dev Mode</Label>
                        <Switch id="auto-dev-mode" checked={settings.auto_dev_mode === 'true'} onCheckedChange={(c) => handleSettingChange('auto_dev_mode', c)} />
                    </div>
                    <div>
                        <Label htmlFor="active-llm">Active LLM Provider</Label>
                        <Input id="active-llm" value={settings.active_llm_provider || ''} onChange={(e) => setSettings(s => ({ ...s, active_llm_provider: e.target.value }))} onBlur={(e) => handleSettingChange('active_llm_provider', e.target.value)} />
                        <CardDescription className="mt-1">e.g., 'openai', 'anthropic', 'cloudflare'</CardDescription>
                    </div>
                     <div>
                        <Label htmlFor="github-repo">GitHub Repository URL</Label>
                        <Input id="github-repo" value={settings.github_repo_url || ''} onChange={(e) => setSettings(s => ({ ...s, github_repo_url: e.target.value }))} onBlur={(e) => handleSettingChange('github_repo_url', e.target.value)} />
                    </div>
                </CardContent>
            </Card>

            <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle>API Key Management</CardTitle>
                    <CardDescription>Keys are encrypted at rest using a master secret. Leave a key blank and click Save to delete it.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    {KEY_PROVIDERS.map(provider => (
                        <div key={provider} className="space-y-2">
                            <Label htmlFor={`key-${provider}`} className="capitalize">{provider.replace('_', ' ')} Key</Label>
                            <div className="flex gap-2">
                                <Input
                                    id={`key-${provider}`}
                                    type="password"
                                    value={apiKeys[provider] || ''}
                                    onChange={(e) => setApiKeys(prev => ({...prev, [provider]: e.target.value}))}
                                    placeholder={keysPresent.includes(provider) ? '•••••••••••••••••••• (Saved)' : 'Enter key...'}
                                />
                                <Button onClick={() => handleApiKeySave(provider)}>Save</Button>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
