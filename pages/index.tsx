import { useState } from 'react';

export default function Home() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/vibecheck', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: input }),
    });
    const data = await res.json();
    setResults(data);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6 text-gray-800 font-sans">
      <style jsx global>{`
        body {
          font-family: 'Inter', sans-serif;
        }
      `}</style>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-indigo-600">Vibecheck</h1>

        <form onSubmit={handleSubmit} className="mb-12 space-y-5">
          <input
            type="text"
            className="w-full p-4 border border-gray-300 rounded text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="Enter a keyword"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            className="w-full bg-indigo-500 text-white py-3 rounded hover:bg-indigo-600 transition"
          >
            {loading ? 'Checking the vibes...' : 'Run Vibecheck'}
          </button>
        </form>

        {!results && (
          <div className="space-y-8">
            {[
              {
                title: '🔍 Multistream Input',
                text: 'Connect Reddit, Gmail, Outlook, Discord, and more to analyze user feedback from all channels.',
              },
              {
                title: '🧠 Smart Clustering',
                text: 'Automatically groups related comments into themes like praise, pain points, and surprising insights.',
              },
              {
                title: '📊 Insight Summaries',
                text: 'Summarizes each cluster into a short, readable insight with keywords and example comments.',
              },
              {
                title: '📥 Inbox Support',
                text: 'Coming soon: connect your Gmail or Outlook inbox to pull feedback from support emails automatically.',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-white px-6 py-6 rounded shadow-sm border border-gray-100 hover:shadow-md transition"
              >
                <h2 className="text-lg font-semibold mb-2 text-gray-900">
                  {item.title}
                </h2>
                <p className="text-gray-700 text-base leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        )}

        {results && (
          <div className="space-y-8 animate-fade-in">
            {/* Summary Card */}
            <div className="bg-white px-6 py-6 rounded shadow text-gray-800 hover:shadow-md transition">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">📌 Summary</h2>
              <p className="text-gray-800 mb-6 whitespace-pre-line text-base leading-relaxed max-w-prose">
                {results.overallSummary}
              </p>

              <div className="text-sm text-gray-700 space-y-6">
                <div>
                  <span className="inline-block text-emerald-600 bg-emerald-100 px-2 py-1 rounded font-semibold text-sm">
                    Most Praised
                  </span>
                  <p className="mt-2 text-base leading-relaxed">{results.topPraise}</p>
                </div>

                <div>
                  <span className="inline-block text-rose-600 bg-rose-100 px-2 py-1 rounded font-semibold text-sm">
                    Most Frustrating
                  </span>
                  <p className="mt-2 text-base leading-relaxed">{results.topPain}</p>
                </div>

                <div>
                  <span className="inline-block text-orange-600 bg-orange-100 px-2 py-1 rounded font-semibold text-sm">
                    Most Intense Feedback
                  </span>
                  <p className="mt-2 text-base leading-relaxed">{results.topIntensity}</p>
                </div>
              </div>
            </div>

            {/* Key Feedback Points */}
            <div className="bg-white px-6 py-6 rounded shadow text-gray-800 hover:shadow-md transition">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">🎯 Key Feedback Points</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8 text-base leading-relaxed">
                <div>
                  <h3 className="font-semibold text-rose-500 mb-3">Top Pain Points</h3>
                  <ul className="space-y-5">
                    {results.painPoints?.map((point, i) => (
                      <li key={i}>
                        <p className="text-gray-800 max-w-prose pt-1">
                          {typeof point === 'string' ? point : point.text}
                        </p>
                        {point.source && (
                          <div className="mt-2 text-sm text-gray-600 italic border-l-[3px] border-gray-200 pl-6 py-2">
                            {point.source}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-emerald-500 mb-3">Top Praise Points</h3>
                  <ul className="space-y-5">
                    {results.praisePoints?.map((point, i) => (
                      <li key={i}>
                        <p className="text-gray-800 max-w-prose pt-1">
                          {typeof point === 'string' ? point : point.text}
                        </p>
                        {point.source && (
                          <div className="mt-2 text-sm text-gray-600 italic border-l-[3px] border-gray-200 pl-6 py-2">
                            {point.source}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
