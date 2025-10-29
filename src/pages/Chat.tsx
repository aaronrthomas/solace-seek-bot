import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();
  const isAnonymous = searchParams.get('anonymous') === 'true';
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

      if (!currentUser && !isAnonymous) {
        navigate('/auth');
        return;
      }

      // Create new session
      const { data: newSession, error } = await supabase
        .from('sessions')
        .insert({
          user_id: currentUser?.id || null,
          is_anonymous: isAnonymous,
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
  }, [navigate, isAnonymous, toast]);

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
    if (!input.trim() || !sessionId) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    // Add user message to database
    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        session_id: sessionId,
        role: 'user',
        content: userMessage
      });

    if (insertError) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Get AI response
    try {
      const { data, error } = await supabase.functions.invoke('ai-therapist-chat', {
        body: {
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage }
          ],
          sessionId,
          type: 'chat'
        }
      });

      if (error) throw error;

      if (data.isCrisis) {
        setShowCrisisModal(true);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast({
        title: 'Error',
        description: 'Failed to get response',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) return;

    setLoading(true);

    // Generate summary
    try {
      const { data } = await supabase.functions.invoke('ai-therapist-chat', {
        body: {
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          sessionId,
          type: 'summary'
        }
      });

      // Update session with summary
      await supabase
        .from('sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          summary: data.message
        })
        .eq('id', sessionId);

      toast({
        title: 'Session ended',
        description: 'Your session summary has been saved.',
      });

      navigate('/history');
    } catch (error) {
      console.error('Error ending session:', error);
      toast({
        title: 'Error',
        description: 'Failed to end session',
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
    <div className="flex flex-col h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur">
        <h1 className="text-xl font-semibold text-foreground">MindfulSpace</h1>
        <div className="flex gap-2">
          {user && (
            <Button variant="ghost" size="icon" onClick={() => navigate('/history')}>
              <History className="h-5 w-5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <Card className="p-6 text-center bg-primary/5 border-primary/20">
            <h2 className="text-xl font-semibold mb-2">Welcome to your safe space</h2>
            <p className="text-muted-foreground">
              Share what's on your mind. I'm here to listen and support you.
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
                  : 'bg-card'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </Card>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <Card className="max-w-[80%] p-4 bg-card">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-card/50 backdrop-blur">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Share what's on your mind..."
            className="min-h-[60px] resize-none"
            disabled={loading}
          />
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleEndSession}
              disabled={loading || messages.length === 0}
              variant="secondary"
              size="icon"
            >
              <AlertCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <CrisisModal open={showCrisisModal} onOpenChange={setShowCrisisModal} />
    </div>
  );
};

export default Chat;