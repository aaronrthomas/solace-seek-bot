import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Shield, Clock, MessageCircle, Brain, CheckCircle } from 'lucide-react';
import heroImage from '@/assets/hero-bg.jpg';

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Heart,
      title: 'Empathetic Support',
      description: 'AI trained in compassionate listening and therapeutic techniques'
    },
    {
      icon: Shield,
      title: 'Safe & Private',
      description: 'Your conversations are confidential and secure'
    },
    {
      icon: Clock,
      title: '24/7 Availability',
      description: 'Get support whenever you need it, day or night'
    },
    {
      icon: MessageCircle,
      title: 'Anonymous Option',
      description: 'Start a session without creating an account'
    },
    {
      icon: Brain,
      title: 'Session Summaries',
      description: 'Review insights and coping strategies from past sessions'
    },
    {
      icon: CheckCircle,
      title: 'Crisis Detection',
      description: 'Immediate access to emergency resources when needed'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="relative container mx-auto px-6 py-20 lg:py-32">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
              <Heart className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              Your Safe Space for Emotional Wellbeing
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Connect with an AI therapist for compassionate support, 
              guidance, and understanding whenever you need it.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                size="lg" 
                className="text-lg px-8"
                onClick={() => navigate('/auth')}
              >
                Get Started
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8"
                onClick={() => navigate('/chat?anonymous=true')}
              >
                Try Anonymously
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Why Choose MindfulSpace
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Professional support designed with your wellbeing in mind
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="border-border/50 hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="p-3 rounded-full bg-primary/10">
                      <Icon className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container mx-auto px-6 py-20 bg-muted/30 rounded-3xl my-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl lg:text-4xl font-bold text-center text-foreground mb-12">
            How It Works
          </h2>
          
          <div className="space-y-8">
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Start a Session</h3>
                <p className="text-muted-foreground">
                  Choose to sign in or continue anonymously. Your privacy is always protected.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Share & Connect</h3>
                <p className="text-muted-foreground">
                  Open up about what's on your mind. The AI therapist listens with empathy and asks thoughtful questions.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Get Support & Insights</h3>
                <p className="text-muted-foreground">
                  Receive compassionate guidance, coping strategies, and a session summary to review anytime.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="text-lg px-8"
            >
              Begin Your Journey
            </Button>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="container mx-auto px-6 py-12">
        <Card className="max-w-3xl mx-auto bg-muted/50 border-border/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              <strong>Important:</strong> MindfulSpace provides supportive conversation and guidance, 
              but is not a substitute for professional mental health care. If you're experiencing a 
              mental health crisis, please contact emergency services or a crisis hotline immediately.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default Index;