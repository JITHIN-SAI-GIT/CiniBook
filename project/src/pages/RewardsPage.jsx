import { useEffect, useState } from 'react';
import {
  Award,
  Ticket,
  Gift,
  AlertCircle,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { rewardsApi } from '../lib/api';

export default function RewardsPage() {
  const { profile, isLoggedIn } = useAuth();
  const [rewards, setRewards] = useState([]);
  const [lifetime, setLifetime] = useState(0);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);

  const THRESHOLD = 10;

  useEffect(() => {
    if (!isLoggedIn || !profile?.id) return;
    rewardsApi
      .getUserRewards(profile.id)
      .then((res) => {
        setLifetime(res.data.lifetimeTickets);
        setCurrent(res.data.ticketsSinceLastReward);
        setRewards(res.data.rewards || []);
      })
      .finally(() => setLoading(false));
  }, [isLoggedIn, profile]);

  const copyToClipboard = (id, code) => {
    navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen pt-24 px-4 flex items-center justify-center">
        <div className="glass p-8 rounded-2xl text-center max-w-md w-full border border-white/10">
          <Award className="w-16 h-16 text-[#ffd60a] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Movie Rewards</h2>
          <p className="text-gray-400 mb-6">
            Log in to view your OTT Vouchers and track your booking rewards!
          </p>
        </div>
      </div>
    );
  }

  const progressPercent = Math.min((current / THRESHOLD) * 100, 100);

  return (
    <div className="min-h-screen pt-24 px-4 pb-16 page-enter">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="glass-strong rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 neon-border-gold relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#ffd60a]/10 rounded-full blur-3xl" />

          <div className="relative z-10 flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ffd60a] to-orange-500 flex items-center justify-center shadow-lg">
              <Gift className="w-8 h-8 text-[#0a0a0f]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white font-outfit">
                My Rewards
              </h1>
              <p className="text-gray-400 mt-1">
                Earn a free 1-Month OTT Subscription for every 10 tickets!
              </p>
            </div>
          </div>

          <div className="relative z-10 flex gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-[#ffd60a]">{lifetime}</p>
              <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">
                Total Tickets
              </p>
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <p className="text-3xl font-bold text-[#e63946]">
                {rewards.length}
              </p>
              <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">
                Rewards Won
              </p>
            </div>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="glass rounded-2xl p-6 md:p-8">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">
                Next Reward Progress
              </h3>
              <p className="text-sm text-gray-400">
                Book {THRESHOLD - current} more tickets to unlock your next
                voucher.
              </p>
            </div>
            <div className="text-2xl font-bold text-white">
              {current}{' '}
              <span className="text-gray-500 text-lg font-medium">
                / {THRESHOLD}
              </span>
            </div>
          </div>

          <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/10 relative">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#e63946] to-[#ffd60a] transition-all duration-1000 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Rewards List */}
        <div>
          <h3 className="text-xl font-bold text-white mb-4">Your Vouchers</h3>
          {loading ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 skeleton rounded-2xl" />
              ))}
            </div>
          ) : rewards.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center border-dashed border-2 border-white/10">
              <Ticket className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">
                You haven't earned any rewards yet.
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Book tickets to fill up your progress bar!
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {rewards.map((reward) => (
                <div
                  key={reward.id}
                  className="glass rounded-2xl p-5 border border-white/10 flex flex-col relative overflow-hidden group"
                >
                  {reward.status === 'AVAILABLE' && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffd60a]/5 rounded-full blur-2xl group-hover:bg-[#ffd60a]/15 transition-colors" />
                  )}

                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded border ${
                          reward.status === 'AVAILABLE'
                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                            : reward.status === 'REDEEMED'
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                        }`}
                      >
                        {reward.status}
                      </span>
                      <h4 className="text-lg font-bold text-white mt-2">
                        {reward.voucher
                          ? `${reward.voucher.partner} - 1 Month`
                          : 'Reward Unlocked!'}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        Earned:{' '}
                        {new Date(reward.earnedDate).toLocaleDateString()}
                      </p>
                    </div>
                    {reward.voucher && (
                      <img
                        src={`https://logo.clearbit.com/${reward.voucher.partner.toLowerCase().replace(' ', '')}.com`}
                        onError={(e) => (e.target.style.display = 'none')}
                        alt={reward.voucher.partner}
                        className="w-10 h-10 rounded shadow bg-white"
                      />
                    )}
                  </div>

                  {reward.voucher ? (
                    <div className="mt-auto pt-4 border-t border-white/10 flex items-center justify-between relative z-10">
                      <div className="font-mono text-lg tracking-wider text-[#ffd60a] bg-black/30 px-3 py-1 rounded">
                        {reward.voucher.code}
                      </div>
                      <button
                        onClick={() =>
                          copyToClipboard(reward.id, reward.voucher.code)
                        }
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                        title="Copy Code"
                      >
                        {copied === reward.id ? (
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        ) : (
                          <Copy className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-auto pt-4 border-t border-white/10 text-sm text-[#e63946] flex items-center gap-2 relative z-10">
                      <AlertCircle className="w-4 h-4" /> Code processing...
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
