import React, { useState } from 'react';
import { ArrowUpRight, Zap, TrendingUp, Users, Target, BarChart3, Search } from 'lucide-react';

const LgLinks = ({ 
  services = [
    { id: 1, name: "Digital PR", icon: "Zap", desc: "Amplify your brand story", link: "/digital-pr" },
    { id: 2, name: "Organic Social & Content", icon: "Users", desc: "Engage and grow your audience", link: "/social-content" },
    { id: 3, name: "Search & Growth Strategy", icon: "TrendingUp", desc: "Scale with data-driven insights", link: "/growth-strategy" },
    { id: 4, name: "Content Experience", icon: "Target", desc: "Create memorable interactions", link: "/content-experience" },
    { id: 5, name: "Data & Insights", icon: "BarChart3", desc: "Transform data into action", link: "/data-insights" },
    { id: 6, name: "Onsite SEO", icon: "Search", desc: "Optimize for visibility", link: "/onsite-seo" },
  ],
  headerTitle = "Our Services",
  headerImage = "https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg",
  viewAllLink = "/services",
  viewAllText = "View All Services",
  stats = [
    { value: "500+", label: "Projects Delivered", gradient: "from-blue-400 to-purple-400" },
    { value: "98%", label: "Client Satisfaction", gradient: "from-purple-400 to-pink-400" },
    { value: "50+", label: "Team Experts", gradient: "from-pink-400 to-red-400" },
    { value: "24/7", label: "Support Available", gradient: "from-red-400 to-orange-400" },
  ],
  onServiceClick,
  showStats = true
}) => {
  const [hoveredId, setHoveredId] = useState(null);

  // Icon mapping
  const iconMap = {
    Zap, TrendingUp, Users, Target, BarChart3, Search
  };

  const handleServiceClick = (service) => {
    if (onServiceClick) {
      onServiceClick(service);
    } else if (service.link) {
      window.location.href = service.link;
    }
  };

  const handleViewAllClick = () => {
    if (viewAllLink) {
      window.location.href = viewAllLink;
    }
  };

  return (
    <section className="bg-white min-h-screen py-20 px-6 md:px-12 font-sans text-[#1a1a1a]">
      {/* Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-6">
        <h2 className="text-6xl md:text-8xl font-medium flex items-center gap-4 tracking-tight">
          {headerTitle.split(' ')[0]} 
          <span className="w-16 h-12 md:w-20 md:h-16 rounded-2xl overflow-hidden inline-block bg-gray-300">
             <img 
              src={headerImage} 
              className="w-full h-full object-cover" 
              alt="team"
             />
          </span>
          {headerTitle.split(' ').slice(1).join(' ')}
        </h2>
        <button 
          onClick={handleViewAllClick}
          className="group flex items-center gap-2 px-6 py-2.5 border border-black rounded-full text-sm font-semibold hover:bg-black hover:text-white transition-all duration-300"
        >
          {viewAllText}
          <ArrowUpRight size={18} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>

      {/* Services Cards Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service, index) => {
          const Icon = iconMap[service.icon] || Target;
          return (
            <div
              key={service.id}
              onMouseEnter={() => setHoveredId(service.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => handleServiceClick(service)}
              className="group relative bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 cursor-pointer transition-all duration-500 hover:shadow-2xl hover:shadow-black/10 hover:-translate-y-2 border border-gray-200 overflow-hidden"
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            >
              {/* Animated Background Gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-pink-500/5 transition-all duration-700 rounded-3xl"></div>
              
              {/* Animated Border Glow */}
              <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: 'linear-gradient(45deg, #3b82f6, #8b5cf6, #ec4899)',
                  WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                  padding: '2px',
                }}
              ></div>

              {/* Number Badge */}
              <div className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center rounded-full bg-black/5 group-hover:bg-black group-hover:text-white transition-all duration-300 text-sm font-bold">
                0{service.id}
              </div>

              {/* Icon */}
              <div className="relative mb-6 w-16 h-16 flex items-center justify-center rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700 group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                <Icon className="text-white" size={32} strokeWidth={2} />
              </div>

              {/* Content */}
              <div className="relative">
                <h3 className="text-2xl font-bold mb-3 text-gray-900 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300">
                  {service.name}
                </h3>
                <p className="text-gray-600 text-sm mb-6 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                  {service.desc}
                </p>

                {/* CTA Arrow */}
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 group-hover:gap-3 transition-all duration-300">
                  <span>Explore</span>
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-900 group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300">
                    <ArrowUpRight className="text-white" size={16} strokeWidth={2.5} />
                  </div>
                </div>
              </div>

              {/* Floating Particles */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
                <div className={`absolute top-1/4 left-1/4 w-1 h-1 bg-blue-500 rounded-full transition-all duration-1000 ${hoveredId === service.id ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}></div>
                <div className={`absolute top-2/3 left-2/3 w-1.5 h-1.5 bg-purple-500 rounded-full transition-all duration-1000 delay-100 ${hoveredId === service.id ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}></div>
                <div className={`absolute top-1/2 left-3/4 w-1 h-1 bg-pink-500 rounded-full transition-all duration-1000 delay-200 ${hoveredId === service.id ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Stats Bar */}
      {showStats && (
        <div className="max-w-7xl mx-auto mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 p-8 rounded-3xl bg-gradient-to-r from-gray-900 to-gray-800 text-white">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className={`text-4xl font-bold mb-2 bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                {stat.value}
              </div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default LgLinks;