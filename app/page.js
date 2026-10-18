'use client';

import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, ShieldCheck, UserPlus, Check, QrCode, X, Download, Copy, Bitcoin, History, Mail, Globe, Award, MessageCircle } from 'lucide-react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80';
const BITCOIN_WALLET_ADDRESS = 'bc1qugpvyyzhync7sr39kvuwuwdzxfypydnj34gxu8';
const AGENCY_EMAIL = 'globalgreen@usa.com';
const WHATSAPP_LINK = 'https://wa.me/message/IUOEEKIQXYGCH1';

const HARDCODED_CELEBRITIES = [
  {
    name: 'Joe [Russell] Butler',
    searchKeywords: ['joe russell butler', 'joe butler', 'russell butler', 'theonlyrussellbutler', 'joe', 'russell'],
    description: 'Digital Creator • 1.5M Followers',
    bio: 'Digital creator represented exclusively by Global Green. "here to make a positive ripple on the planet • Just be a good human"',
    image: 'https://i.postimg.cc/WhcG6yJr/photo-5913510603672719076-y.jpg',
  },
];

const CUSTOM_SERVICES = [
  {
    id: 'voice-call',
    title: 'Voice Call',
    basePrice: 500,
    desc: 'Direct 1-on-1 scheduled audio conversation.',
    features: [
      'Private phone or VoIP voice connection',
      'Scheduled coordination and management',
      'Official booking confirmation receipt',
    ],
  },
  {
    id: 'video-call',
    title: 'Video Call',
    basePrice: 1000,
    desc: 'Private face-to-face virtual video session.',
    features: [
      'High-definition virtual face-to-face session',
      'Priority scheduling and technical setup',
      'Digital commemorative screenshot or recording option',
    ],
  },
  {
    id: 'meet-greet',
    title: 'Meet and Greet',
    basePrice: 5000,
    desc: 'Exclusive in-person meeting and greeting experience.',
    features: [
      'In-person scheduled meeting in a secure environment',
      'Professional commemorative photography session',
      'Authenticated physical autograph or souvenir',
    ],
  },
  {
    id: 'others-custom',
    title: 'Others (Custom Offering)',
    basePrice: 250, // Minimum base price
    desc: 'Custom bespoke directives tailored to your specific campaign or requests.',
    features: [
      'Tailored custom instructions and special directives',
      'Dynamic pricing based on custom requirements',
      'Dedicated concierge review and approval',
    ],
  },
];

export default function GlobalGreenApp() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCeleb, setSelectedCeleb] = useState(null);
  
  // Service selection & search
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState(null);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [customPrice, setCustomPrice] = useState(250);
  const [txHash, setTxHash] = useState('');
  
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Admin and UI states
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddCeleb, setShowAddCeleb] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  // Add Celeb States
  const [newCelebName, setNewCelebName] = useState('');
  const [newCelebBio, setNewCelebBio] = useState('');
  const [newCelebImage, setNewCelebImage] = useState('');
  const [addingCeleb, setAddingCeleb] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href);
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('admin') === 'true') {
        setIsAdmin(true);
      }
    }
  }, []);

  // Calculate dynamic price for custom offering
  useEffect(() => {
    if (selectedService?.id === 'others-custom') {
      if (!customMessage.trim()) {
        setCustomPrice(250);
        return;
      }
      const calculated = Math.max(250, Math.round(customMessage.trim().length * 2.5));
      setCustomPrice(calculated);
    }
  }, [customMessage, selectedService]);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const rawSearch = searchQuery.trim();
    if (!rawSearch) return;

    setLoading(true);
    setSelectedCeleb(null);
    setSelectedService(null);
    setServiceSearchQuery('');

    const cleanTerm = rawSearch.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

    try {
      // 1. Check Hardcoded Management Roster
      const localMatch = HARDCODED_CELEBRITIES.find((celeb) =>
        celeb.searchKeywords.some((kw) => kw.includes(cleanTerm) || cleanTerm.includes(kw))
      );

      if (localMatch) {
        setSelectedCeleb({
          name: localMatch.name,
          description: localMatch.description,
          bio: localMatch.bio,
          image: localMatch.image || FALLBACK_IMAGE,
          services: CUSTOM_SERVICES,
        });
        setLoading(false);
        return;
      }

      // 2. Check Admin-Added Roster from Firestore
      if (db) {
        const celebRef = collection(db, 'custom_celebrities');
        const querySnapshot = await getDocs(celebRef);
        let matchedDoc = null;

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const docName = (data.name || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
          const docNameLower = (data.name_lowercase || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

          if (
            docName.includes(cleanTerm) ||
            cleanTerm.includes(docName) ||
            (docNameLower && (docNameLower.includes(cleanTerm) || cleanTerm.includes(docNameLower)))
          ) {
            matchedDoc = data;
          }
        });

        if (matchedDoc) {
          setSelectedCeleb({
            name: matchedDoc.name,
            description: matchedDoc.description || 'Global Green Managed Public Figure',
            bio: matchedDoc.bio || 'Official talent under Global Green management.',
            image: matchedDoc.image || FALLBACK_IMAGE,
            services: CUSTOM_SERVICES,
          });
          setLoading(false);
          return;
        }
      }

      // 3. Dynamic Wikipedia API Lookup
      const formattedName = rawSearch.replace(/\b\w/g, (char) => char.toUpperCase());
      const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(rawSearch)}`;

      const res = await fetch(wikiUrl);
      if (res.ok) {
        const wikiData = await res.json();
        
        let wikiImage = FALLBACK_IMAGE;
        if (wikiData.thumbnail && wikiData.thumbnail.source) {
          wikiImage = wikiData.thumbnail.source;
        } else if (wikiData.originalimage && wikiData.originalimage.source) {
          wikiImage = wikiData.originalimage.source;
        }

        const wikiBio = wikiData.extract || `${formattedName} is represented under Global Green management.`;
        const wikiDescription = wikiData.description || 'Global Green Managed Public Figure';

        setSelectedCeleb({
          name: wikiData.title || formattedName,
          description: wikiDescription,
          bio: wikiBio,
          image: wikiImage,
          services: CUSTOM_SERVICES,
        });
      } else {
        setSelectedCeleb({
          name: formattedName,
          description: 'Global Green Managed Public Figure',
          bio: `${formattedName} is officially represented under Global Green talent management and security brokerage. Available for private access, appearances, and VIP booking.`,
          image: FALLBACK_IMAGE,
          services: CUSTOM_SERVICES,
        });
      }

    } catch (err) {
      console.error('Directory search error:', err);
      const formattedName = rawSearch.replace(/\b\w/g, (char) => char.toUpperCase());
      setSelectedCeleb({
        name: formattedName,
        description: 'Global Green Managed Public Figure',
        bio: `${formattedName} is officially represented under Global Green talent management and security brokerage.`,
        image: FALLBACK_IMAGE,
        services: CUSTOM_SERVICES,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomCeleb = async (e) => {
    if (e) e.preventDefault();
    if (!newCelebName.trim()) return;

    setAddingCeleb(true);
    try {
      await addDoc(collection(db, 'custom_celebrities'), {
        name: newCelebName.trim(),
        name_lowercase: newCelebName.trim().toLowerCase(),
        bio: newCelebBio.trim() || 'Global Green Represented Public Figure',
        description: 'Global Green Managed Public Figure',
        image: newCelebImage.trim() || FALLBACK_IMAGE,
        createdAt: serverTimestamp(),
      });

      alert(`Successfully registered ${newCelebName} to Global Green database!`);
      setSearchQuery(newCelebName);
      setNewCelebName('');
      setNewCelebBio('');
      setNewCelebImage('');
      setShowAddCeleb(false);
    } catch (err) {
      console.error('Error registering talent:', err);
      alert('Failed to register talent profile.');
    } finally {
      setAddingCeleb(false);
    }
  };

  const handleCopyWallet = () => {
    navigator.clipboard.writeText(BITCOIN_WALLET_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeServicePrice = selectedService?.id === 'others-custom' ? customPrice : (selectedService ? selectedService.basePrice : 0);

  const handleConfirmBitcoinPayment = async (e) => {
    if (e) e.preventDefault();
    if (!customerEmail || !selectedService) {
      alert('Please enter your email and select an offering.');
      return;
    }

    setSubmittingBooking(true);

    try {
      await addDoc(collection(db, 'bookings'), {
        agency: 'Global Green Management',
        celeb_name: selectedCeleb.name,
        service_title: selectedService.title,
        amount_usd: activeServicePrice,
        payment_method: 'Bitcoin (BTC)',
        bitcoin_wallet: BITCOIN_WALLET_ADDRESS,
        customer_email: customerEmail.trim(),
        custom_message: customMessage || 'N/A',
        transaction_hash: txHash.trim() || 'Pending Verification',
        status: 'pending_blockchain_confirmation',
        createdAt: serverTimestamp(),
      });

      setBookingSuccess(true);
    } catch (firebaseErr) {
      console.error('Firebase save error:', firebaseErr);
      alert('Error recording booking. Please try again.');
    } finally {
      setSubmittingBooking(false);
    }
  };

  // Only filter and display offers if the user has typed something into the search bar
  const filteredServices = serviceSearchQuery.trim()
    ? CUSTOM_SERVICES.filter(service => 
        service.title.toLowerCase().includes(serviceSearchQuery.toLowerCase()) ||
        service.desc.toLowerCase().includes(serviceSearchQuery.toLowerCase())
      )
    : [];

  const btcQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=bitcoin:${BITCOIN_WALLET_ADDRESS}`;
  const portalQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    currentUrl || 'https://globalgreen.com'
  )}`;

  return (
    <div className="min-h-screen bg-[#06090e] text-slate-100 font-sans p-6 selection:bg-emerald-500 selection:text-black">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/20 via-[#06090e] to-black"></div>

      <header className="relative max-w-5xl mx-auto flex justify-between items-center pb-8 border-b border-emerald-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#0a1f18] border border-emerald-500/30 flex items-center justify-center shrink-0">
            <img 
              src="/logo.png" 
              alt="Global Green Logo" 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wider text-white uppercase flex items-center gap-2">
              Global Green <span className="text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">EST. 1982</span>
            </h1>
            <p className="text-[11px] text-slate-400">Talent Management & VIP Security Services</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 px-3.5 py-2 rounded-xl transition-all"
          >
            <QrCode className="w-4 h-4" />
            Portal QR
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowAddCeleb(!showAddCeleb)}
              className="flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 px-3.5 py-2 rounded-xl transition-all"
            >
              <UserPlus className="w-4 h-4" />
              Register Talent
            </button>
          )}

          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300">
            <Globe className="w-4 h-4 text-emerald-400" />
            USD ($)
          </div>
        </div>
      </header>

      {showQrModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 max-w-sm w-full text-center relative shadow-2xl">
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-emerald-400 mb-1">Global Green Access QR</h3>
            <p className="text-xs text-slate-400 mb-5">
              Scan with a mobile camera to access this portal directly.
            </p>

            <div className="bg-white p-4 rounded-2xl inline-block mb-5 shadow-inner">
              <img src={portalQrUrl} alt="Portal QR Code" className="w-48 h-48 mx-auto" />
            </div>

            <a
              href={portalQrUrl}
              download="Global_Green_Portal_QR.png"
              target="_blank"
              rel="noreferrer"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs transition-all"
            >
              <Download className="w-4 h-4" /> Download QR Image
            </a>
          </div>
        </div>
      )}

      <main className="relative max-w-5xl mx-auto mt-8">
        {isAdmin && showAddCeleb && (
          <form onSubmit={handleAddCustomCeleb} className="mb-8 bg-slate-900 border border-emerald-500/40 rounded-2xl p-5 space-y-3 shadow-xl">
            <h3 className="font-bold text-emerald-400 flex items-center gap-2 text-sm">
              <UserPlus className="w-4 h-4" /> Register New Managed Talent to Global Green Database
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Full Name (e.g. Will Smith)"
                className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                value={newCelebName}
                onChange={(e) => setNewCelebName(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Bio / Agency Description"
                className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                value={newCelebBio}
                onChange={(e) => setNewCelebBio(e.target.value)}
              />
              <input
                type="url"
                placeholder="Image URL"
                className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                value={newCelebImage}
                onChange={(e) => setNewCelebImage(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={addingCeleb}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl transition-all"
            >
              {addingCeleb ? 'Saving Profile...' : 'Save Talent Profile'}
            </button>
          </form>
        )}

        <div className="mb-8 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 backdrop-blur-md">
          <div className="flex items-start gap-3">
            <History className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Established in 1982</h2>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                For over four decades, Global Green has served as a premiere international talent management and security brokerage firm representing high-profile public figures, creators, and executive leaders globally.
              </p>
            </div>
          </div>
          <a
            href={`mailto:${AGENCY_EMAIL}`}
            className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 px-3.5 py-2 rounded-xl flex-shrink-0 transition-all cursor-pointer"
          >
            <Mail className="w-4 h-4 text-emerald-400" />
            <span>{AGENCY_EMAIL}</span>
          </a>
        </div>

        {/* Celebrity Search Section */}
        <div className="mb-10">
          <div className="relative">
            <input
              type="text"
              placeholder="Search Global Green Talent Directory..."
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 pl-12 text-white focus:outline-none focus:border-emerald-500 transition-all text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch(e);
                }
              }}
            />
            <Search className="absolute left-4 top-4.5 text-slate-500 w-5 h-5" />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleSearch(e);
              }}
              disabled={loading}
              className="absolute right-2.5 top-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs transition-all"
            >
              {loading ? 'Searching Directory...' : 'Search Directory'}
            </button>
          </div>
        </div>

        {/* Celebrity Dossier & Offers Section */}
        {selectedCeleb && (
          <div className="space-y-8">
            {/* Celebrity Dossier Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <img
                src={selectedCeleb.image}
                alt={selectedCeleb.name}
                onError={(e) => {
                  e.target.src = FALLBACK_IMAGE;
                }}
                className="w-full h-64 object-contain bg-slate-950 rounded-2xl border border-slate-800"
              />
              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-white">{selectedCeleb.name}</h2>
                  <Award className="text-emerald-400 w-5 h-5" />
                </div>
                <p className="text-emerald-400 text-xs font-semibold">Global Green Managed Public Figure</p>
                <p className="text-slate-300 text-xs leading-relaxed">{selectedCeleb.bio}</p>

                <div className="pt-2 text-xs text-slate-400 space-y-1 bg-slate-950/60 p-3.5 rounded-xl border border-emerald-500/20">
                  <p className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Global Green Regulations:
                  </p>
                  <p>• All privileges are subject to management approval, security requirements, and scheduling availability.</p>
                </div>
              </div>
            </div>

            {/* Service Search & Selection Area */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h3 className="text-lg font-bold text-white">Search Offering / Service</h3>
                
                {/* Service Search Bar */}
                <div className="relative w-full md:w-72">
                  <input
                    type="text"
                    placeholder="Search offers (e.g. video call)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 pl-9 text-xs text-white focus:outline-none focus:border-emerald-500"
                    value={serviceSearchQuery}
                    onChange={(e) => setServiceSearchQuery(e.target.value)}
                  />
                  <Search className="absolute left-3 top-3 text-slate-500 w-4 h-4" />
                </div>
              </div>

              {/* Only show matching offers when search query has input */}
              {serviceSearchQuery.trim() === '' ? (
                <div className="text-center py-8 text-slate-500 text-xs bg-slate-950/40 rounded-2xl border border-slate-800">
                  Type an offering keyword above (e.g., <span className="text-emerald-400">call</span>, <span className="text-emerald-400">meet</span>, <span className="text-emerald-400">others</span>) to display available services.
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs bg-slate-950/40 rounded-2xl border border-slate-800">
                  No matching offerings found for &ldquo;{serviceSearchQuery}&rdquo;. Try searching for &ldquo;call&rdquo;, &ldquo;meet&rdquo;, or &ldquo;others&rdquo;.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredServices.map((tier) => (
                    <div
                      key={tier.id}
                      onClick={() => setSelectedService(tier)}
                      className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                        selectedService?.id === tier.id
                          ? 'border-emerald-500 bg-emerald-500/10 shadow-lg'
                          : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-sm text-white">{tier.title}</h4>
                          <span className="font-extrabold text-base text-emerald-400">
                            {tier.id === 'others-custom' ? 'Custom ($250+)' : `$${tier.basePrice.toLocaleString()}`}
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs">{tier.desc}</p>
                      </div>

                      <ul className="mt-3 space-y-1.5 border-t border-slate-800 pt-3">
                        {tier.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                            <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {selectedService && (
                <div className="mt-8 bg-slate-950 p-6 rounded-2xl border border-emerald-500/30 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2">
                      <Bitcoin className="w-6 h-6 text-emerald-400" />
                      <h4 className="font-bold text-white text-base">Direct Bitcoin (BTC) Settlement</h4>
                    </div>
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-semibold">
                      Global Green Treasury
                    </span>
                  </div>

                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-center space-y-3">
                    <p className="text-xs text-slate-300">Scan QR Code or copy agency wallet to transfer <strong>${activeServicePrice.toLocaleString()} USD</strong> in Bitcoin:</p>
                    
                    <div className="bg-white p-3 rounded-xl inline-block shadow-md">
                      <img src={btcQrCodeUrl} alt="Bitcoin QR Code" className="w-40 h-40 mx-auto" />
                    </div>

                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2.5">
                      <input
                        type="text"
                        readOnly
                        value={BITCOIN_WALLET_ADDRESS}
                        className="bg-transparent text-emerald-400 font-mono text-xs w-full focus:outline-none px-2"
                      />
                      <button
                        type="button"
                        onClick={handleCopyWallet}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-all flex-shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {copied ? 'Copied!' : 'Copy Address'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <input
                      type="email"
                      placeholder="Enter client email for official Global Green documentation..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      required
                    />

                    <textarea
                      rows={3}
                      placeholder={
                        selectedService.id === 'others-custom'
                          ? 'Describe your custom offering/request in detail (pricing scales automatically with text length)...'
                          : 'Enter special instructions, itinerary details, or venue preferences (optional)...'
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                    />

                    <input
                      type="text"
                      placeholder="Enter Bitcoin Transaction Hash / TXID (optional)..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                      value={txHash}
                      onChange={(e) => setTxHash(e.target.value)}
                    />
                  </div>

                  <div className="text-xs text-slate-400 bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <span className="text-emerald-400 font-semibold">Policy Note:</span> Fifty percent (50%) of the applicable fee is refundable once access has been officially confirmed.
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <div>
                      <span className="text-xs text-slate-400 block">Total Agreement Fee</span>
                      <span className="text-3xl font-extrabold text-emerald-400">
                        ${activeServicePrice.toLocaleString()}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleConfirmBitcoinPayment}
                      disabled={submittingBooking}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-8 py-3.5 rounded-xl flex items-center gap-2 transition-all shadow-lg text-xs"
                    >
                      <CheckCircle className="w-5 h-5" />
                      {submittingBooking ? 'Transmitting...' : 'Confirm Bitcoin Transfer'}
                    </button>
                  </div>
                </div>
              )}

              {bookingSuccess && (
                <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-xl flex items-center gap-3 text-emerald-400 text-xs">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  Transfer details submitted to Global Green Concierge. Your booking is under blockchain verification and security clearance.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* FLOATING DIRECT WHATSAPP CONCIERGE BUTTON */}
      <div className="fixed bottom-6 right-6 z-40">
        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-slate-950 font-bold px-5 py-3.5 rounded-full shadow-2xl transition-all border border-emerald-400/40"
          style={{ backgroundColor: '#10b981' }}
        >
          <MessageCircle className="w-5 h-5 fill-slate-950 text-emerald-500" />
          <span className="text-xs">WhatsApp Concierge</span>
        </a>
      </div>
    </div>
  );
}