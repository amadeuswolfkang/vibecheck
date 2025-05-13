import { useState } from 'react';
import { signIn, signOut, useSession, getSession } from 'next-auth/react';

interface VibecheckResults {
  overallSummary: string;
  topPraise: string;
  topPain: string;
  topIntensity: string;
  topRequestedFeature: string;
  praisePoints: { 
    text: string; 
    source?: string; 
    sender?: string; 
    senderEmail?: string; 
    date?: string; 
  }[];
  painPoints: { 
    text: string; 
    source?: string; 
    sender?: string; 
    senderEmail?: string; 
    date?: string; 
  }[];
  requestedFeatures: { 
    text: string; 
    source?: string; 
    sender?: string; 
    senderEmail?: string; 
    date?: string; 
  }[];
}


export default function Home() {
  const { data: session } = useSession();
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailResults, setGmailResults] = useState<VibecheckResults | null>(
    null
  );

  async function handleGmailOnlyCheck() {
    setGmailLoading(true);

    try {
      // Fetch the current session to get a fresh access token
      const session = await getSession();

      if (!session || !session.accessToken) {
        console.error('No active session or missing access token');
        setGmailLoading(false);
        return;
      }

      const body = {
        gmailAccessToken: session.accessToken,
      };

      const res = await fetch('/api/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        setGmailResults(data.gmailFeedback);
      } else {
        console.error('Error fetching Gmail data:', data);
      }
    } catch (error) {
      console.error('Error in Gmail API call:', error);
    } finally {
      setGmailLoading(false);
    }
  }

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body {
          font-family: 'Inter', sans-serif;
        }
      `}</style>
      <main className="min-h-screen bg-slate-50 text-gray-900 px-4 py-4 flex flex-col items-center font-sans">
        <div className="w-full max-w-2xl">
          <h1 className="text-3xl font-bold mb-10 text-indigo-600 relative inline-block">
            Vibecheck
            <span className="absolute -bottom-2 left-0 w-12 h-1 bg-indigo-300 rounded-full"></span>
          </h1>

          {!session ? (
            <button
              onClick={() => signIn('google')}
              className="w-2/5 mx-auto flex justify-center bg-rose-500 text-white py-2 rounded-lg hover:bg-rose-600 transition mb-6 font-medium text-md min-h-[42px]"
            >
              Connect Gmail
            </button>
          ) : (
            <div className="mb-6">
              <p className="text-gray-800 mb-4 font-semibold text-center">
                {session.user?.email}
              </p>
              <button
                onClick={() => signOut()}
                className="w-2/5 mx-auto flex justify-center bg-rose-500 text-white py-2 rounded-full hover:bg-rose-600 transition mb-6 font-medium text-md min-h-[42px]"
              >
                Disconnect
              </button>
            </div>
          )}

          <button
            onClick={handleGmailOnlyCheck}
            className="w-2/5 mx-auto flex justify-center bg-emerald-500 text-white py-2 rounded-full hover:bg-emerald-600 transition mb-6 font-medium text-md min-h-[42px]"
            disabled={!session || gmailLoading}
          >
            {gmailLoading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 mx-auto"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="opacity-25"
                  ></circle>
                  <path
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    className="opacity-75"
                  ></path>
                </svg>
              </>
            ) : (
              'Vibecheck (Gmail)'
            )}
          </button>

          {gmailResults && (
            <div className="space-y-6 mt-12">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                Gmail Inbox Feedback
              </h2>
              {renderFeedback(gmailResults)}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function renderFeedback(data: VibecheckResults) {
  if (!data)
    return <p className="text-gray-500 text-lg">No feedback available.</p>;

  return (
    <div className="space-y-4">
      <div className="bg-white p-6 rounded-xl border border-slate-300">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">📄 Summary</h3>
        <p className="text-md text-gray-800">{data.overallSummary}</p>
      </div>
      <div className="bg-white p-6 rounded-xl border border-slate-300">
        <div className="mb-6">
          <span className="bg-green-100 text-emerald-700 text-sm font-semibold px-3 py-1 rounded-full">
            Most Praised
          </span>
          <p className="text-md mt-2">{data.topPraise}</p>
        </div>
        <div className="mb-6">
          <span className="bg-rose-100 text-rose-700 text-sm font-semibold px-3 py-1 rounded-full">
            Most Painful
          </span>
          <p className="text-md mt-2">{data.topPain}</p>
        </div>
        <div className="mt-6">
          <span className="bg-amber-100 text-amber-700 text-sm font-semibold px-3 py-1 rounded-full">
            Most Intense
          </span>
          <p className="text-md mt-2">{data.topIntensity}</p>
        </div>
        <div className="mt-6">
          <span className="bg-blue-100 text-blue-700 text-sm font-semibold px-3 py-1 rounded-full">
            Most Requested
          </span>
          <p className="text-md mt-2">{data.topRequestedFeature}</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl border border-slate-300">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          🎯 Key Feedback Points
        </h2>

        <div className="grid grid-cols-2 gap-12">
          {/* Top Pain Points */}
{/* Top Pain Points */}
<div>
  <h3 className="text-lg font-semibold text-rose-500 mb-4">Top Pain Points</h3>
  {data.painPoints.map((point, index) => {
    const formattedDate = point.date
      ? new Date(point.date).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : 'Unknown Date';
    
    return (
      <div key={index} className="mb-8">
        <p className="text-md text-gray-900 font-md">{point.text}</p>
        <blockquote className="text-gray-600 italic border-l-4 border-gray-200 pl-4 mt-2">
          {point.source}
        </blockquote>
        {point.sender && (
          <div className="mt-2 flex flex-col text-sm">
            <span className="bg-gray-100 text-gray-700 font-semibold px-2 py-0.5 rounded-full w-max mb-1">
              {point.sender}
            </span>
            <span className="text-gray-500 text-xs">{point.senderEmail}</span>
            <span className="text-gray-400 text-xs">{formattedDate}</span>
          </div>
        )}
      </div>
    );
  })}
</div>

{/* Top Praise Points */}
<div>
  <h3 className="text-lg font-semibold text-emerald-500 mb-4">Top Praise Points</h3>
  {data.praisePoints.map((point, index) => {
    const formattedDate = point.date
      ? new Date(point.date).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : 'Unknown Date';
    
    return (
      <div key={index} className="mb-8">
        <p className="text-md text-gray-900 font-md">{point.text}</p>
        <blockquote className="text-gray-600 italic border-l-4 border-gray-200 pl-4 mt-2">
          {point.source}
        </blockquote>
        {point.sender && (
          <div className="mt-2 flex flex-col text-sm">
            <span className="bg-gray-100 text-gray-700 font-semibold px-2 py-0.5 rounded-full w-max mb-1">
              {point.sender}
            </span>
            <span className="text-gray-500 text-xs">{point.senderEmail}</span>
            <span className="text-gray-400 text-xs">{formattedDate}</span>
          </div>
        )}
      </div>
    );
  })}
</div>



        </div>
      </div>
    </div>
  );
}
