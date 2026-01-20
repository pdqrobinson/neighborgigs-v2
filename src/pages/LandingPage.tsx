import React from 'react';
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
    message: 'Dog walking in the neighborhood for the next hour',
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
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-green-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Help Your Neighbors.<br />
              <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Earn Together.
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              The hyperlocal broadcast app that lets neighbors help each other with immediate errands. 
              Need help? Broadcast it. Available to help? Let your neighborhood know.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/location-gate')}
                className="bg-blue-600 text-white py-4 px-8 rounded-xl font-semibold text-lg hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
              >
                Start Broadcasting
              </button>
              <button
                onClick={() => navigate('/location-gate')}
                className="bg-white text-gray-900 py-4 px-8 rounded-xl font-semibold text-lg border-2 border-gray-300 hover:border-blue-400 transition"
              >
                See What's Nearby
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast Examples */}
      <div className="bg-gray-50 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Real examples of neighbors helping neighbors
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {BROADCAST_EXAMPLES.map((example, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl flex-shrink-0">{example.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          example.type === 'need_help'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {example.type === 'need_help' ? 'Need Help' : 'Offering Help'}
                      </span>
                    </div>
                    <p className="text-gray-900 font-medium mb-2">{example.message}</p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{example.author}</span>
                      <span className="text-green-600 font-medium">
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
      <div className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why NeighborGigs?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Built for real neighborhoods, real connections, real help
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {FEATURES.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-green-600 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Help or Get Help?
          </h2>
          <p className="text-xl text-blue-50 mb-8">
            Join your neighborhood and start connecting with neighbors in minutes.
          </p>
          <button
            onClick={() => navigate('/location-gate')}
            className="bg-white text-blue-600 py-4 px-8 rounded-xl font-semibold text-lg hover:bg-gray-100 transition shadow-lg"
          >
            Get Started Now
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2026 NeighborGigs. Helping neighbors help each other.
          </p>
        </div>
      </div>
    </div>
  );
}
