import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Send, History, LogOut, Loader2, AlertCircle } from 'lucide-react';
import CrisisModal from '@/components/CrisisModal';
import { User } from '@supabase/supabase-js';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

const Chat = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initSession = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      // Require authentication - no anonymous access
      if (!currentUser) {
        navigate('/auth');
        return;
      }

      // Create new authenticated session
      const { data: newSession, error } = await supabase
        .from('sessions')
        .insert({
          user_id: currentUser.id,
          is_anonymous: false,
          status: 'active'
        })
        .select()
        .single();

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to create session',
          variant: 'destructive',
        });
        return;
      }

      setSessionId(newSession.id);
    };

    initSession();
  }, [navigate, toast]);

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !sessionId || !user) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    try {
      // Insert user message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          session_id: sessionId,
          role: 'user',
          content: userMessage
        });

      if (messageError) throw messageError;

      // Call AI therapist function
      const { data, error: functionError } = await supabase.functions.invoke('ai-therapist-chat', {
        body: {
          message: userMessage,
          sessionId: sessionId,
          requestType: 'chat'
        }
      });

      if (functionError) throw functionError;

      // Check for crisis detection
      if (data?.showCrisisResources) {
        setShowCrisisModal(true);
      }

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!sessionId || !user) return;

    setLoading(true);

    try {
      // Generate session summary
      const { data, error: summaryError } = await supabase.functions.invoke('ai-therapist-chat', {
        body: {
          sessionId: sessionId,
          requestType: 'summary'
        }
      });

      if (summaryError) throw summaryError;

      // Update session in database
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          summary: data.summary
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      toast({
        title: 'Session Ended',
        description: 'Your session summary has been saved',
      });

      navigate('/history');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to end session',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <h1 className="text-xl font-semibold">MindfulSpace</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/history')}
            >
              <History className="w-4 h-4 mr-2" />
              History
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="container max-w-3xl space-y-4">
          {messages.length === 0 && (
            <Card className="p-6 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold mb-2">Welcome to your safe space</h2>
              <p className="text-muted-foreground">
                Share what's on your mind. This is a judgment-free zone where you can express yourself openly.
              </p>
            </Card>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <Card
                className={`max-w-[80%] p-4 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </Card>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <Card className="max-w-[80%] p-4 bg-muted">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              </Card>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
        <div className="container max-w-3xl">
          <div className="flex gap-2 mb-2">
            <Textarea
              placeholder="Type your message here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={loading}
              className="min-h-[80px]"
            />
            <div className="flex flex-col gap-2">
              <Button onClick={handleSend} disabled={loading || !input.trim()} size="icon">
                <Send className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                onClick={handleEndSession}
                disabled={loading || messages.length === 0}
                size="sm"
              >
                End Session
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {user && `Logged in as ${user.email}`}
          </p>
        </div>
      </div>

      <CrisisModal open={showCrisisModal} onOpenChange={setShowCrisisModal} />
    </div>
  );
};

export default Chat;