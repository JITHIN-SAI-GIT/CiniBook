import { Link } from 'react-router-dom';
import { Film, Github, Twitter, Instagram, Facebook, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#09090e] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-[#e63946] to-[#c1121f] rounded-xl flex items-center justify-center">
                <Film className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                Cine<span className="text-[#ffd60a]">Book</span>
              </span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
              The premier movie ticket booking platform for Telugu and Indian
              cinema. Experience the magic of movies at Hyderabad's best
              theatres.
            </p>
            <div className="flex items-center gap-3">
              {[Github, Twitter, Instagram, Facebook].map((Icon, i) => (
                <button
                  key={i}
                  className="w-9 h-9 rounded-xl glass border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/25 transition-all"
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">
              Explore
            </h4>
            <ul className="space-y-2">
              {[
                { label: 'Movies', to: '/movies' },
                { label: 'Telugu Films', to: '/movies?language=Telugu' },
                { label: 'Trending', to: '/movies?trending=true' },
                { label: 'My Bookings', to: '/dashboard' },
              ].map(({ label, to }) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="text-sm text-gray-400 hover:text-[#ffd60a] transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">
              Contact
            </h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-gray-400">
                <Mail className="w-3.5 h-3.5 text-[#ffd60a]" />
                support@cinebook.in
              </li>
              <li className="text-sm text-gray-400">📍 Hyderabad, Telangana</li>
              <li className="text-sm text-gray-400">📞 +91 90000 00000</li>
            </ul>
            <div className="mt-4 glass rounded-xl p-3 border border-[#ffd60a]/20">
              <p className="text-[11px] text-gray-400">
                <span className="text-[#ffd60a] font-medium">Built with</span>{' '}
                React + Spring Boot + MySQL
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            © 2025 CineBook. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Refund Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
