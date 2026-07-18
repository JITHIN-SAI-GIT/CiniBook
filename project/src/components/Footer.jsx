import { Link } from 'react-router-dom';
import { Film, Github, Instagram, Mail } from 'lucide-react';
import cinebookLogo from '../assets/image.png';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#09090e] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="
                relative flex items-center justify-center shrink-0
                w-9 h-9 rounded-[10px]
                bg-[rgba(255,255,255,0.03)] backdrop-blur-xl
                border-2 border-[#cc2335]/50
                shadow-[0_0_15px_rgba(204,35,53,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]
                transition-all duration-250 ease-[cubic-bezier(0.2,0.8,0.2,1)]
                group-hover:scale-[1.08] group-hover:-translate-y-[2px]
                group-hover:bg-[rgba(255,255,255,0.08)] group-hover:border-[#cc2335]/80
                group-hover:shadow-[0_0_25px_rgba(204,35,53,0.6),inset_0_1px_0_rgba(255,255,255,0.2)]
                overflow-hidden
              ">
                <img
                  src={cinebookLogo}
                  alt="CineBook"
                  className="w-[112%] h-[112%] max-w-none object-cover"
                />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                Cine<span className="text-[#e63946]">Book</span>
              </span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
              The premier movie ticket booking platform for Telugu and Indian
              cinema. Experience the magic of movies at Hyderabad's best
              theatres.
            </p>
            <div className="flex items-center gap-3">
              {[
                { Icon: Github, url: 'https://github.com/JITHIN-SAI-GIT' },
                { Icon: Instagram, url: 'https://www.instagram.com/just_jithinnn/?__pwa=1#' }
              ].map(({ Icon, url }, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl glass border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/25 transition-all"
                >
                  <Icon className="w-4 h-4" />
                </a>
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
