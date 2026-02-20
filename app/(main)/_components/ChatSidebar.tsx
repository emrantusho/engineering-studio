"use client";
import { useEffect, useState } from 'react';
import { useApi } from '@/app/lib/api';
import { toast } from 'sonner';
import { PlusCircle, MessageSquare, Settings, LogOut } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import Link from 'next/link';
import { useAuth } from '@/app/lib/AuthContext';

interface Chat {
    id: string;
    title: string;
}

export default function ChatSidebar({ isOpen }: { isOpen: boolean }) {
    const [chats, setChats] = useState<Chat[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [isNewChatDialogOpen, setIsNewChatDialogOpen] = useState(false);
    const [newChatTitle, setNewChatTitle] = useState('');
    const api = useApi();
    const { user, logout } = useAuth();

    const fetchChats = async () => {
        try {
            // THE FIX IS HERE: We add <Chat[]> to the api.get call.
            const data = await api.get<Chat[]>('/chat');
            setChats(data);
        } catch (error) {
            toast.error("Failed to load chat history.");
        }
    };

    useEffect(() => {
        fetchChats();
    }, []);

    const handleCreateChat = async () => {
        if (!newChatTitle.trim()) {
            toast.error("Title cannot be empty.");
            return;
        }
        try {
            const newChat = await api.post<Chat>('/chat', {
                title: newChatTitle,
                message: "New chat started."
            });
            setChats([newChat, ...chats]);
            setActiveChatId(newChat.id);
            setIsNewChatDialogOpen(false);
            setNewChatTitle('');
            toast.success("New chat created!");
        } catch (error) {
            toast.error("Failed to create chat.");
        }
    };

    return (
        <>
            <aside className={cn(
                "flex flex-col bg-secondary border-r transition-all duration-300",
                isOpen ? "w-64" : "w-0 overflow-hidden"
            )}>
                <div className="p-4 flex justify-between items-center border-b">
                    <h2 className="text-lg font-semibold">Chats</h2>
                    <Button variant="ghost" size="icon" onClick={() => setIsNewChatDialogOpen(true)}>
                        <PlusCircle className="w-5 h-5" />
                    </Button>
                </div>
                <nav className="flex-1 overflow-y-auto p-2 space-y-1">
                    {chats.map(chat => (
                        <a
                            key={chat.id}
                            href="#"
                            onClick={() => setActiveChatId(chat.id)}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted",
                                activeChatId === chat.id && "bg-muted text-primary"
                            )}
                        >
                            <MessageSquare className="h-4 w-4" />
                            <span className="truncate">{chat.title}</span>
                        </a>
                    ))}
                </nav>
                <div className="p-2 border-t mt-auto">
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                        <span className="text-sm font-medium">{user?.username}</span>
                        <div className="flex items-center gap-1">
                            <Link href="/admin" passHref>
                                <Button variant="ghost" size="icon"><Settings className="w-4 h-4" /></Button>
                            </Link>
                            <Button variant="ghost" size="icon" onClick={logout}><LogOut className="w-4 h-4" /></Button>
                        </div>
                    </div>
                </div>
            </aside>
            <Dialog open={isNewChatDialogOpen} onOpenChange={setIsNewChatDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Chat</DialogTitle>
                        <DialogDescription>
                            Give your new chat session a descriptive title.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="title" className="text-right">
                                Title
                            </Label>
                            <Input
                                id="title"
                                value={newChatTitle}
                                onChange={(e) => setNewChatTitle(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" onClick={handleCreateChat}>Create</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
