"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Send, Bot, User, Paperclip } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/app/lib/utils';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

const DUMMY_MESSAGES: Message[] = [
    { id: '1', role: 'assistant', content: 'Hello! I am your AI engineering assistant. How can I help you today?' }
];

export default function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>(DUMMY_MESSAGES);
    const [input, setInput] = useState('');
    const parentRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const rowVirtualizer = useVirtualizer({
        count: messages.length,
        getScrollElement: () => parentRef.current,
        estimateSize: useCallback(() => 100, []),
        overscan: 5,
    });

    useEffect(() => {
        if (messages.length > 0) {
            rowVirtualizer.scrollToIndex(messages.length - 1, { align: 'end', behavior: 'smooth' });
        }
    }, [messages.length, rowVirtualizer]);
    
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const scrollHeight = textareaRef.current.scrollHeight;
            textareaRef.current.style.height = `${scrollHeight}px`;
        }
    }, [input]);

    const handleSendMessage = async () => {
        if (!input.trim()) return;

        const newUserMessage: Message = { id: crypto.randomUUID(), role: 'user', content: input };
        setMessages(prev => [...prev, newUserMessage]);
        setInput('');

        // TODO: Implement actual API call to the streaming endpoint
        setTimeout(() => {
            const assistantResponse: Message = { id: crypto.randomUUID(), role: 'assistant', content: "This is a simulated response. The real implementation would connect to the streaming API." };
            setMessages(prev => [...prev, assistantResponse]);
        }, 1000);
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div ref={parentRef} className="flex-1 overflow-y-auto p-4 space-y-6">
                <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                    {rowVirtualizer.getVirtualItems().map(virtualItem => {
                        const message = messages[virtualItem.index];
                        return (
                            <div
                                key={message.id}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    transform: `translateY(${virtualItem.start}px)`,
                                    padding: '8px 0',
                                }}
                                className={cn("flex items-start gap-4")}
                            >
                                {message.role === 'assistant' ? (
                                    <>
                                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                                            <Bot className="w-5 h-5 text-foreground" />
                                        </div>
                                        <div className="max-w-2xl rounded-lg p-3 text-sm bg-secondary">
                                            <ReactMarkdown className="prose prose-sm max-w-none" remarkPlugins={[remarkGfm]}>
                                                {message.content}
                                            </ReactMarkdown>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-start gap-4 ml-auto">
                                      <div className="max-w-2xl rounded-lg p-3 text-sm bg-primary text-primary-foreground">
                                          <ReactMarkdown className="prose prose-sm max-w-none prose-invert" remarkPlugins={[remarkGfm]}>
                                                {message.content}
                                            </ReactMarkdown>
                                      </div>
                                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                                          <User className="w-5 h-5 text-foreground" />
                                      </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="p-4 border-t bg-background">
                <div className="relative">
                    <Textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask a question or type '/' for commands..."
                        className="w-full resize-none bg-secondary rounded-lg p-3 pr-24 min-h-[48px] max-h-48"
                        rows={1}
                    />
                    <div className="absolute top-1/2 right-3 -translate-y-1/2 flex items-center gap-2">
                        <Button variant="ghost" size="icon"><Paperclip className="w-4 h-4" /></Button>
                        <Button size="icon" onClick={handleSendMessage}><Send className="w-4 h-4" /></Button>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                    Press <kbd className="px-2 py-1 text-xs font-semibold rounded-md bg-secondary">Enter</kbd> to send, <kbd className="px-2 py-1 text-xs font-semibold rounded-md bg-secondary">Shift+Enter</kbd> for a new line.
                </p>
            </div>
        </div>
    );
}
