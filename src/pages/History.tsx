import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Session {
  id: string;
  created_at: string;
  ended_at: string | null;
  summary: string | null;
  status: string;
}

const History = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setSessions(data);
      }
      
      setLoading(false);
    };

    fetchSessions();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background">
        <p className="text-muted-foreground">Loading your sessions...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/chat')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Session History</h1>
            <p className="text-muted-foreground">Review your past therapy sessions</p>
          </div>
        </div>

        {sessions.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground mb-4">No completed sessions yet</p>
              <Button onClick={() => navigate('/chat')}>Start Your First Session</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <Card key={session.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        Session on {format(new Date(session.created_at), 'MMMM dd, yyyy')}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(session.created_at), 'h:mm a')}
                        </div>
                        {session.ended_at && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {Math.round(
                              (new Date(session.ended_at).getTime() - 
                               new Date(session.created_at).getTime()) / 60000
                            )} minutes
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                {session.summary && (
                  <CardContent>
                    <CardDescription className="text-sm whitespace-pre-wrap">
                      {session.summary}
                    </CardDescription>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;