import { useNavigate } from 'react-router-dom';

const BROADCAST_EXAMPLES = [
  {
    type: 'need_help',
    icon: '🚚',
    message: 'Need someone with a truck to help move a couch',
    author: 'Sarah M.',
    responseTime: '8 minutes',
  },
  {
    type: 'offer_help',
    icon: '🛒',
    message: 'Heading to Trader Joe\'s in 15 mins—need anything?',
    author: 'Mike T.',
    responseTime: '12 minutes',
  },
  {
    type: 'need_help',
    icon: '🔧',
    message: 'Quick help fixing a leaky faucet—will pay well!',
    author: 'David L.',
    responseTime: '5 minutes',
  },
  {
    type: 'offer_help',
    icon: '🐕',
    message: 'Dog walking in the neighborhood for next hour',
    author: 'Emma R.',
    responseTime: '10 minutes',
  },
];

const FEATURES = [
  {
    title: 'Hyperlocal',
    description: 'Connect with neighbors within 1-3 miles of your location',
    icon: '📍',
  },
  {
    title: 'Instant',
    description: 'Broadcast needs or offers and get responses in minutes',
    icon: '⚡',
  },
  {
    title: 'Simple',
    description: 'No long forms—just say what you need or what you\'re doing',
    icon: '💬',
  },
  {
    title: 'Trusted',
    description: 'See profiles, ratings, and work history from your neighborhood',
    icon: '✨',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-green-600/5" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Help Your Neighbors.<br />
              <span className="text-primary">Earn Together.</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
              The hyperlocal broadcast app that lets neighbors help each other with immediate errands. 
              Need help? Broadcast it. Available to help? Let your neighborhood know.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/location-gate')}
                className="bg-primary text-primary-foreground py-4 px-10 rounded-lg font-semibold text-base hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl"
              >
                Start Broadcasting
              </button>
              <button
                onClick={() => navigate('/location-gate')}
                className="bg-card text-foreground py-4 px-10 rounded-lg font-semibold text-base border-2 border-border hover:border-primary/50 transition-colors"
              >
                See What's Nearby
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast Examples */}
      <div className="bg-muted/30 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Real examples of neighbors helping neighbors
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {BROADCAST_EXAMPLES.map((example, index) => (
              <div
                key={index}
                className="bg-card rounded-lg shadow-sm border border-border p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl flex-shrink-0">{example.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                          example.type === 'need_help'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-green-600/10 text-green-700'
                        }`}
                      >
                        {example.type === 'need_help' ? 'Need Help' : 'Offering Help'}
                      </span>
                    </div>
                    <p className="text-foreground font-medium mb-3">{example.message}</p>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{example.author}</span>
                      <span className="text-green-700 font-medium">
                        ✓ {example.responseTime} response time
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Why NeighborGigs?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built for real neighborhoods, real connections, real help
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {FEATURES.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-primary to-green-600 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-6">
            Ready to Help or Get Help?
          </h2>
          <p className="text-lg text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
            Join your neighborhood and start connecting with neighbors in minutes.
          </p>
          <button
            onClick={() => navigate('/location-gate')}
            className="bg-background text-foreground py-4 px-10 rounded-lg font-semibold text-base hover:bg-background/90 transition-colors shadow-lg"
          >
            Get Started Now
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-muted/20 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-muted-foreground text-sm">
            © 2026 NeighborGigs. Helping neighbors help each other.
          </p>
        </div>
      </div>
    </div>
  );
}
