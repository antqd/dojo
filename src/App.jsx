// App.jsx
import React, { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Link } from "react-router-dom";

import {
  ShieldCheckIcon,
  BanknotesIcon,
  BoltIcon,
  ArrowPathIcon,
  FunnelIcon,
  ChartBarIcon,
  BellAlertIcon,
  DocumentChartBarIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";

gsap.registerPlugin(ScrollTrigger);

export default function App() {
  const root = useRef(null);
  const heroImg = useRef(null);

  const [isDojoOpen, setDojoOpen] = useState(false);
  const [isDojoBusinessOpen, setDojoBusinessOpen] = useState(false);
  const [isTreRateOpen, setTreRateOpen] = useState(false);
  const [isMobileOpen, setMobileOpen] = useState(false);

  useGSAP(
    () => {
      gsap.from(".hero-stagger", {
        opacity: 0,
        y: 24,
        duration: 0.8,
        stagger: 0.12,
        ease: "power2.out",
      });

      if (heroImg.current) {
        gsap.to(heroImg.current, {
          y: -10,
          rotateZ: 1.5,
          duration: 2,
          yoyo: true,
          repeat: -1,
          ease: "sine.inOut",
        });
      }

      gsap.utils.toArray(".reveal").forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 30,
          duration: 0.6,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 85%" },
        });
      });
    },
    { scope: root }
  );

  const closeAllMenus = () => {
    setDojoOpen(false);
    setDojoBusinessOpen(false);
    setTreRateOpen(false);
    setMobileOpen(false);
  };

  const toggleMobileMenu = () => {
    if (isMobileOpen) {
      closeAllMenus();
      return;
    }
    setDojoOpen(false);
    setDojoBusinessOpen(false);
    setTreRateOpen(false);
    setMobileOpen(true);
  };

  return (
    <div ref={root} className="min-h-screen bg-[#F6F7F6] text-[#0B2B23]">
      {/* NAVBAR */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-black/5">
        <div className="mx-auto max-w-9xl px-4 py-4 flex items-center justify-between">
          {/* LOGO + TESTO SOTTO (INVARIATO) */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <img src="/images/logo.png" alt="DOJO" className="h-14" />
              {/* Nome marchio visibile */}
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-wide uppercase text-[#0B2B23]">
                  ExpoPay
                </span>
              </div>
              <span className="sr-only">Dojo</span>
            </div>
            <p className="text-xs text-[#2B4A42]">
              Expopay è un marchio di Expo Energia Srl Agente Dojo. <br />
              Via De Amicis snc , 87036 Rende (CS) P. Iva 03689480782
            </p>
          </div>

          {/* NAV DESKTOP */}
          <div className="hidden md:flex items-center gap-6 text-sm">
            {/* DOJO BUSINESS → App Store / Play Store */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setDojoBusinessOpen((prev) => !prev);
                  setDojoOpen(false);
                  setTreRateOpen(false);
                }}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-[#0B2B23] hover:bg-black/5"
              >
                <span>Dojo Business</span>
                <svg
                  className={`h-4 w-4 transition-transform ${
                    isDojoBusinessOpen ? "rotate-180" : ""
                  }`}
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M5.5 7.5L10 12L14.5 7.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {isDojoBusinessOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white shadow-lg ring-1 ring-black/5 overflow-hidden text-sm">
                  <a
                    href="https://apps.apple.com/gb/app/dojo-for-business-payments/id1500585319"
                    target="_blank"
                    rel="noreferrer"
                    className="block px-4 py-2 text-[#0B2B23] hover:bg-[#F0FAF7]"
                    onClick={closeAllMenus}
                  >
                    Scarica su App Store (iOS)
                  </a>
                  <a
                    href="https://play.google.com/store/apps/details?id=uk.co.paymentsense.superpay"
                    target="_blank"
                    rel="noreferrer"
                    className="block px-4 py-2 text-[#0B2B23] hover:bg-[#F0FAF7]"
                    onClick={closeAllMenus}
                  >
                    Scarica su Google Play (Android)
                  </a>
                </div>
              )}
            </div>
            {/* MENU DOJO A TENDINA (SFONDO VERDE) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setDojoOpen((prev) => !prev);
                  setTreRateOpen(false);
                  setDojoBusinessOpen(false);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[#1BA97F] px-4 py-2 text-white text-sm font-medium shadow hover:brightness-110"
              >
                <span>Dojo</span>
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M5.5 7.5L10 12L14.5 7.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {isDojoOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-lg ring-1 ring-black/5 overflow-hidden text-sm">
                  {/* Prima voce: Attiva Dojo */}
                  <Link
                    to="/compiler-dojo"
                    className="block px-4 py-2 text-[#0B2B23] hover:bg-[#F0FAF7]"
                    onClick={closeAllMenus}
                  >
                    Attiva Dojo
                  </Link>
                  <a
                    href="#chi-siamo"
                    className="block px-4 py-2 text-[#0B2B23] hover:bg-[#F0FAF7]"
                    onClick={closeAllMenus}
                  >
                    Chi siamo
                  </a>
                  <a
                    href="#servizi"
                    className="block px-4 py-2 text-[#0B2B23] hover:bg-[#F0FAF7]"
                    onClick={closeAllMenus}
                  >
                    I nostri servizi
                  </a>
                  <a
                    href="#diventa-partner"
                    className="block px-4 py-2 text-[#0B2B23] hover:bg-[#F0FAF7]"
                    onClick={closeAllMenus}
                  >
                    Diventa Partner
                  </a>
                  <a
                    href="#diventa-personal-manager"
                    className="block px-4 py-2 text-[#0B2B23] hover:bg-[#F0FAF7]"
                    onClick={closeAllMenus}
                  >
                    Diventa Personal Manager
                  </a>
                </div>
              )}
            </div>

            {/* ATTIVA 3 RATE A TENDINA */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setTreRateOpen((prev) => !prev);
                  setDojoOpen(false);
                  setDojoBusinessOpen(false);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[#a91b1b] px-4 py-2 text-white text-sm font-medium shadow hover:brightness-110"
              >
                <span>Attiva 3 Rate</span>
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M5.5 7.5L10 12L14.5 7.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {isTreRateOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-lg ring-1 ring-black/5 overflow-hidden text-sm">
                  {/* Area riservata → link esterno Davveroo */}
                  <a
                    href="https://www.davveroo.it/portal/login"
                    target="_blank"
                    rel="noreferrer"
                    className="block px-4 py-2 text-[#0B2B23] hover:bg-[#FDF2F2]"
                    onClick={closeAllMenus}
                  >
                    Area riservata
                  </a>
                  {/* Modulo di consenso → vecchio link di 3 Rate */}
                  <Link
                    to="/compileradesione"
                    className="block px-4 py-2 text-[#0B2B23] hover:bg-[#FDF2F2]"
                    onClick={closeAllMenus}
                  >
                    Modulo di consenso
                  </Link>
                </div>
              )}
            </div>

            {/* LINK RAPIDI */}
            <a
              href="https://www.davveroo.it"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#ffffff] px-4 py-2 text-sm font-semibold text-white shadow hover:brightness-110"
            >
              <img
                src="/loghi/davveroo.png"
                alt="Davveroo"
                className="h-9 w-auto"
              />
            </a>
            <a
              href="https://www.expomarket.it"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#ffffff] px-4 py-2 text-sm font-semibold text-white shadow hover:brightness-110"
            >
              <img
                src="/loghi/expomarket.png"
                alt="Expomarket"
                className="h-7 w-auto"
              />
            </a>
          </div>

          {/* HAMBURGER MOBILE */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-full border border-black/10 bg-white/70 backdrop-blur text-[#0B2B23]"
            onClick={toggleMobileMenu}
            aria-label="Apri menu"
          >
            {isMobileOpen ? (
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </svg>
            )}
          </button>
        </div>

        {/* MOBILE MENU PANEL */}
        {isMobileOpen && (
          <div className="md:hidden border-t border-black/5 bg-white/95 backdrop-blur">
            <nav className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-1 text-sm text-[#0B2B23]">
              {/* DOJO (accordion) */}
              <button
                type="button"
                onClick={() => {
                  setDojoOpen((prev) => !prev);
                  setTreRateOpen(false);
                  setDojoBusinessOpen(false);
                }}
                className="flex items-center justify-between py-2"
              >
                <span className="font-medium">Dojo</span>
                <svg
                  className={`h-4 w-4 transition-transform ${
                    isDojoOpen ? "rotate-180" : ""
                  }`}
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M5.5 7.5L10 12L14.5 7.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {isDojoOpen && (
                <div className="ml-3 flex flex-col gap-1 pb-2">
                  <Link
                    to="/compiler-dojo"
                    className="py-1"
                    onClick={closeAllMenus}
                  >
                    Attiva Dojo
                  </Link>
                  <a href="#chi-siamo" className="py-1" onClick={closeAllMenus}>
                    Chi siamo
                  </a>
                  <a href="#servizi" className="py-1" onClick={closeAllMenus}>
                    I nostri servizi
                  </a>
                  <a
                    href="#diventa-partner"
                    className="py-1"
                    onClick={closeAllMenus}
                  >
                    Diventa Partner
                  </a>
                  <a
                    href="#diventa-personal-manager"
                    className="py-1"
                    onClick={closeAllMenus}
                  >
                    Diventa Personal Manager
                  </a>
                </div>
              )}

              {/* DOJO BUSINESS */}
              <button
                type="button"
                onClick={() => {
                  setDojoBusinessOpen((prev) => !prev);
                  setDojoOpen(false);
                  setTreRateOpen(false);
                }}
                className="flex items-center justify-between py-2 font-medium"
              >
                <span>Dojo Business</span>
                <svg
                  className={`h-4 w-4 transition-transform ${
                    isDojoBusinessOpen ? "rotate-180" : ""
                  }`}
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M5.5 7.5L10 12L14.5 7.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {isDojoBusinessOpen && (
                <div className="ml-3 flex flex-col gap-1 pb-2">
                  <a
                    href="https://apps.apple.com/gb/app/dojo-for-business/id1451518248"
                    target="_blank"
                    rel="noreferrer"
                    className="py-1"
                    onClick={closeAllMenus}
                  >
                    App Store (iOS)
                  </a>
                  <a
                    href="https://play.google.com/store/apps/details?id=com.merchant.application"
                    target="_blank"
                    rel="noreferrer"
                    className="py-1"
                    onClick={closeAllMenus}
                  >
                    Google Play (Android)
                  </a>
                </div>
              )}

              {/* ATTIVA 3 RATE (accordion) */}
              <button
                type="button"
                onClick={() => {
                  setTreRateOpen((prev) => !prev);
                  setDojoOpen(false);
                  setDojoBusinessOpen(false);
                }}
                className="flex items-center justify-between py-2"
              >
                <span className="font-medium">Attiva 3 Rate</span>
                <svg
                  className={`h-4 w-4 transition-transform ${
                    isTreRateOpen ? "rotate-180" : ""
                  }`}
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M5.5 7.5L10 12L14.5 7.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {isTreRateOpen && (
                <div className="ml-3 flex flex-col gap-1 pb-1">
                  <a
                    href="https://www.davveroo.it/portal/login"
                    target="_blank"
                    rel="noreferrer"
                    className="py-1"
                    onClick={closeAllMenus}
                  >
                    Area riservata
                  </a>
                  <Link
                    to="/compileradesione"
                    className="py-1"
                    onClick={closeAllMenus}
                  >
                    Modulo di consenso
                  </Link>
                </div>
              )}

              {/* LINK RAPIDI */}
              <div className="mt-2 flex flex-col gap-2">
                <a
                  href="https://www.davveroo.it"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1D4ED8] px-4 py-2 text-sm font-semibold text-white shadow hover:brightness-110"
                  onClick={closeAllMenus}
                >
                  <img
                    src="/davveroo.png"
                    alt="Davveroo"
                    className="h-5 w-auto"
                  />
                  Davveroo
                </a>
                <a
                  href="https://www.expomarket.it"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#F97316] px-4 py-2 text-sm font-semibold text-white shadow hover:brightness-110"
                  onClick={closeAllMenus}
                >
                  <img
                    src="/expomarket.png"
                    alt="Expomarket"
                    className="h-5 w-auto"
                  />
                  Expomarket
                </a>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-white">
        <div className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-[#1BA97F]/10 blur-3xl" />
        <div className="mx-auto max-w-6xl px-4 grid lg:grid-cols-2 gap-10 items-center py-16">
          <div>
            <p className="hero-stagger text-xs uppercase tracking-[0.2em] text-[#1BA97F] mb-3">
              Expopay • POS Dojo • Pay Later • Servizi web
            </p>
            <h1 className="hero-stagger text-4xl sm:text-5xl font-semibold leading-tight text-[#0B2B23] font-serif">
              Pagamenti, rate e web
              <br />
              in un unico{" "}
              <span className="text-[#1BA97F]">partner digitale</span>
            </h1>
            <p className="hero-stagger mt-4 text-base text-[#2B4A42] max-w-xl">
              Non solo POS Dojo: ti aiutiamo a incassare, vendere a rate in 3
              pagamenti e portare la tua attività online con landing page,
              webapp ed e-commerce su misura.
            </p>

            <div className="hero-stagger mt-6 flex flex-wrap items-center gap-3">
              {[
                "/images/cards/visa.png",
                "/images/cards/mastercard.png",
                "/images/cards/maestro.png",
                "/images/cards/applepay.png",
                "/images/cards/googlepay.png",
                "/images/cards/samsung.png",
              ].map((src, i) => (
                <img key={i} src={src} alt="logo circuito" className="h-6" />
              ))}
            </div>

            <div className="hero-stagger mt-8 flex gap-3 flex-wrap">
              <Link
                to="/form-partner-manager"
                className="rounded-full bg-[#1BA97F] px-5 py-3 text-white font-medium shadow hover:brightness-110"
              >
                Diventa Referral Partner
              </Link>
              <a
                href="#servizi"
                className="rounded-full px-5 py-3 border border-[#1BA97F] text-[#1BA97F] font-medium hover:bg-[#1BA97F]/5"
              >
                Scopri i servizi
              </a>
            </div>

            <div className="hero-stagger mt-8 grid gap-3 sm:grid-cols-3 text-sm">
              <a
                href="#servizi-pos-dojo"
                className="rounded-2xl bg-[#F6F7F6] border border-black/5 px-4 py-3 shadow-sm hover:shadow transition"
              >
                <p className="font-semibold">POS fisico Dojo</p>
                <p className="text-xs text-[#2B4A42]/80">
                  Pagamenti rapidi in negozio.
                </p>
              </a>
              <a
                href="#servizi-pay-later"
                className="rounded-2xl bg-[#F6F7F6] border border-black/5 px-4 py-3 shadow-sm hover:shadow transition"
              >
                <p className="font-semibold">Pay Later in 3 rate</p>
                <p className="text-xs text-[#2B4A42]/80">
                  Vendi in 3 pagamenti con Stripe/Klarna.
                </p>
              </a>
              <a
                href="#servizi-web-digitali"
                className="rounded-2xl bg-[#F6F7F6] border border-black/5 px-4 py-3 shadow-sm hover:shadow transition"
              >
                <p className="font-semibold">Servizi web</p>
                <p className="text-xs text-[#2B4A42]/80">
                  Landing, webapp, e-commerce.
                </p>
              </a>
            </div>
          </div>

          <div className="relative">
            <img
              ref={heroImg}
              src="/images/dojo.png"
              alt="Dojo POS"
              className="relative z-10 w-full max-w-md mx-auto drop-shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* ============= CHI SIAMO (NUOVO LOOK) ============= */}
      <section
        id="chi-siamo"
        className="bg-gradient-to-b from-white via-[#F3FBF8] to-[#E5F4EE]"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 grid md:grid-cols-[1.1fr,0.95fr] gap-10 items-start">
          <div className="reveal space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/60 border border-[#1BA97F]/20 px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#1BA97F]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1BA97F]" />
              Expo Energia • Expopay
            </span>

            <h2 className="text-3xl sm:text-4xl font-semibold font-serif text-[#0B2B23]">
              Chi siamo
            </h2>

            <p className="text-sm font-mono text-[#1BA97F] uppercase tracking-[0.2em]">
              Work in progress
            </p>

            <p className="text-[#2B4A42] leading-relaxed">
              Qui racconteremo la storia di Expo Energia, di come è nato il
              progetto Expopay e della partnership con Dojo per portare
              pagamenti smart e soluzioni digitali alle attività locali.{" "}
              <span className="font-medium">
                Testo in aggiornamento: Work in progress.
              </span>
            </p>

            <p className="text-[#2B4A42]/85 text-sm leading-relaxed">
              Userai questo spazio per spiegare chi siete, i vostri valori, il
              team, l&apos;esperienza nel settore energia e pagamenti e perché
              un esercente dovrebbe scegliere voi come partner unico per POS,
              Pay Later e servizi web.
            </p>
          </div>

          <div className="reveal">
            <div className="rounded-3xl bg-white p-6 shadow-[0_18px_40px_rgba(0,0,0,0.06)] border border-[#D8EAE2] relative overflow-hidden">
              <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-[#1BA97F]/8 blur-2xl" />
              <div className="border-l-4 border-[#1BA97F] pl-4">
                <h3 className="text-lg font-semibold text-[#0B2B23]">
                  Cosa facciamo in una frase
                </h3>
                <p className="mt-2 text-sm text-[#2B4A42] leading-relaxed">
                  Aiutiamo negozi, ristoranti e attività locali a incassare
                  meglio, vendere di più e digitalizzare il proprio business,
                  unendo POS fisici, soluzioni di pagamento rateale e progetti
                  web su misura.
                </p>
              </div>

              <div className="mt-5 grid gap-3 text-sm text-[#2B4A42]">
                <div className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#1BA97F]" />
                  <p>Consulenza sui pagamenti e soluzioni Dojo.</p>
                </div>
                <div className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#1BA97F]" />
                  <p>Integrazione con e-commerce e sistemi gestionali.</p>
                </div>
                <div className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#1BA97F]" />
                  <p>Sviluppo siti, landing page e webapp dedicate.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============= I NOSTRI SERVIZI (LOOK DIVERSO) ============= */}
      <section id="servizi" className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="reveal flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <h2 className="text-3xl sm:text-4xl font-semibold font-serif">
                I nostri servizi
              </h2>
              <p className="mt-3 text-[#2B4A42] max-w-2xl">
                Dopo l&apos;attivazione del POS Dojo ti seguiamo con un
                ecosistema di soluzioni che aumentano lo scontrino medio,
                semplificano i pagamenti e portano il tuo business online.
              </p>
            </div>

            <div className="flex gap-2 text-xs text-[#2B4A42]/80 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-[#F6F7F6]">
                POS fisico
              </span>
              <span className="px-3 py-1 rounded-full bg-[#F6F7F6]">
                Pay Later
              </span>
              <span className="px-3 py-1 rounded-full bg-[#F6F7F6]">
                Web & digitale
              </span>
            </div>
          </div>

          <div className="mt-10 grid md:grid-cols-3 gap-6">
            {/* POS FISICO DOJO */}
            <div
              id="servizi-pos-dojo"
              className="reveal rounded-3xl bg-[#F6F7F6] p-6 shadow-[0_16px_30px_rgba(0,0,0,0.04)] border border-[#E1E7E4]"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <BoltIcon className="h-5 w-5 text-[#1BA97F]" />
                </span>
                <h3 className="text-lg font-semibold">POS fisico Dojo</h3>
              </div>
              <p className="mt-3 text-sm text-[#2B4A42] leading-relaxed">
                Terminali POS moderni, veloci e affidabili, con bonifici rapidi
                e assistenza dedicata. Perfetti per ristoranti, bar, negozi e
                attività locali che vogliono incassare in modo semplice e
                trasparente.
              </p>
              <ul className="mt-4 text-xs text-[#2B4A42]/85 space-y-1.5">
                <li>• Transazioni rapide e uptime elevato</li>
                <li>• Acquisto o noleggio del dispositivo</li>
                <li>• Supporto italiano e gestione completa tramite app</li>
              </ul>
            </div>

            {/* PAY LATER IN 3 RATE */}
            <div
              id="servizi-pay-later"
              className="reveal rounded-3xl bg-[#0F3E34] p-6 shadow-[0_18px_36px_rgba(0,0,0,0.35)] text-white relative overflow-hidden"
            >
              <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-[#1BA97F]/30 blur-2xl" />
              <div className="flex items-center gap-3 relative z-10">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 border border-white/20">
                  <BanknotesIcon className="h-5 w-5" />
                </span>
                <h3 className="text-lg font-semibold">Pay Later in 3 rate</h3>
              </div>
              <p className="mt-3 text-sm text-white/90 leading-relaxed relative z-10">
                Offri ai tuoi clienti la possibilità di pagare in 3 comode rate,
                grazie a soluzioni tipo Tripago, Stripe, Klarna e servizi BNPL
                collegati. Tu incassi, il cliente dilaziona il pagamento.
              </p>
              <ul className="mt-4 text-xs text-white/85 space-y-1.5 relative z-10">
                <li>• Aumenti lo scontrino medio e le conversioni</li>
                <li>
                  • Ideale per prodotti ad alto valore (es. elettronica, arredo)
                </li>
                <li>• Integrazione con POS fisico e/o checkout online</li>
              </ul>
            </div>

            {/* SERVIZI WEB & DIGITALI */}
            <div
              id="servizi-web-digitali"
              className="reveal rounded-3xl bg-[#FDFBF7] p-6 shadow-[0_16px_30px_rgba(0,0,0,0.04)] border border-[#E8E0CF]"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <DocumentChartBarIcon className="h-5 w-5 text-[#C26A28]" />
                </span>
                <h3 className="text-lg font-semibold">Servizi web su misura</h3>
              </div>
              <p className="mt-3 text-sm text-[#2B4A42] leading-relaxed">
                Realizziamo landing page, webapp e e-commerce cuciti sulla tua
                attività, integrati con sistemi di pagamento moderni e pensati
                per generare risultati veri.
              </p>
              <ul className="mt-4 text-xs text-[#2B4A42]/85 space-y-1.5">
                <li>• Landing page per campagne e lead generation</li>
                <li>• Webapp gestionali e servizi custom</li>
                <li>• E-commerce completi con pagamenti integrati</li>
                <li>• Qualsiasi progetto web/tech: dal design al deploy</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* PAY LATER FOCUS */}
      <section id="pay-later" className="bg-[#0F3E34] text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 grid md:grid-cols-2 gap-10 items-center">
          <div className="reveal space-y-4">
            <h2 className="text-3xl sm:text-4xl font-semibold font-serif">
              Pay Later in 3 rate:
              <br />
              vendi di più, subito
            </h2>
            <p className="text-white/90">
              Dai ai tuoi clienti la possibilità di acquistare oggi e pagare in
              3 pagamenti, sfruttando le integrazioni con Stripe, Klarna e
              servizi simili. Tu incassi, loro dilazionano.
            </p>
            <ul className="space-y-2 text-sm text-white/80">
              <li>• Aumenti lo scontrino medio e la chiusura delle vendite</li>
              <li>• Ideale per prodotti e servizi ad alto valore</li>
              <li>• Attivabile online e in negozio</li>
              <li>• Configurazione e supporto tecnico curati da noi</li>
            </ul>
            <p className="text-xs text-white/60">
              Indicata per elettronica, arredamento, centri estetici, formazione
              e tutte le attività con ticket medio importante.
            </p>
          </div>

          <div className="reveal rounded-2xl bg-white/5 p-6 border border-white/10">
            <h3 className="text-lg font-semibold">Come funziona</h3>
            <ol className="mt-3 space-y-2 text-sm text-white/85 list-decimal list-inside">
              <li>Scegli il prodotto/servizio da proporre a rate.</li>
              <li>Il cliente seleziona il pagamento in 3 rate.</li>
              <li>Viene eseguito il controllo automatico in pochi secondi.</li>
              <li>
                Il cliente paga la prima rata, le successive vengono addebitate
                in automatico.
              </li>
            </ol>
            <p className="mt-4 text-sm text-white/75">
              Tu vedi tutto in una dashboard chiara: incassi, rate, status dei
              pagamenti e statistiche di utilizzo.
            </p>
          </div>
        </div>
      </section>

      {/* SERVIZI WEB FOCUS */}
      <section id="servizi-web" className="bg-[#F6F5F2]">
        <div className="mx-auto max-w-6xl px-4 py-14 grid md:grid-cols-2 gap-10 items-center">
          <div className="reveal rounded-3xl bg-white p-6 shadow-[0_18px_40px_rgba(0,0,0,0.06)] border border-[#E2DED3]">
            <h3 className="text-lg font-semibold">
              Landing page, webapp, e-commerce
            </h3>
            <p className="mt-2 text-sm text-[#2B4A42] leading-relaxed">
              Non ci fermiamo al POS: possiamo progettare e sviluppare per te
              qualsiasi soluzione web legata al tuo business.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-[#2B4A42]">
              <li>• Landing page per campagne pubblicitarie</li>
              <li>• Siti vetrina moderni e ottimizzati mobile</li>
              <li>• Webapp per gestire prenotazioni, ordini, clienti</li>
              <li>• E-commerce integrati con Stripe, Dojo e Pay Later</li>
            </ul>
            <p className="mt-4 text-xs text-[#2B4A42]/70">
              I testi e i dettagli tecnici li potrai adattare alla tua offerta
              come sviluppatore full-stack.
            </p>
          </div>

          <div className="reveal space-y-4">
            <h2 className="text-3xl sm:text-4xl font-semibold font-serif">
              Il tuo Personal Developer
            </h2>
            <p className="text-[#2B4A42]">
              Oltre ai pagamenti, puoi contare su un referente tecnico che si
              occupa di tutta la parte web: design, sviluppo, integrazioni, SEO
              di base e deployment.
            </p>
            <ul className="space-y-2 text-sm text-[#2B4A42]/90">
              <li>• Un unico contatto per POS, Pay Later e web</li>
              <li>• Progetti su misura, niente template generici</li>
              <li>• Possibilità di evolvere il sito nel tempo</li>
            </ul>
            <Link
              to="/contact-form"
              className="inline-flex rounded-full bg-[#1BA97F] px-5 py-3 text-white text-sm font-semibold shadow hover:brightness-110"
            >
              Richiedi un progetto web
            </Link>
          </div>
        </div>
      </section>

      {/* DIVENTA PARTNER */}
      <section id="diventa-partner" className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 grid md:grid-cols-2 gap-10 items-center">
          <div className="reveal space-y-4">
            <h2 className="text-3xl sm:text-4xl font-semibold font-serif">
              Diventa Partner Expopay
            </h2>
            <p className="text-[#2B4A42]">
              Sei un consulente, un&apos;agenzia o hai contatti con attività
              locali? Puoi proporre Dojo, Pay Later e i nostri servizi web ai
              tuoi clienti e guadagnare sulle attivazioni e sui progetti
              digitali.
            </p>
            <ul className="text-sm text-[#2B4A42]/90 space-y-2">
              <li>• Proponi POS Dojo, Pay Later e servizi web</li>
              <li>• Accesso a materiali commerciali e supporto dedicato</li>
              <li>• Commissioni e incentivi su attivazioni e progetti</li>
            </ul>
            <p className="text-xs text-[#2B4A42]/70">
              Compila la scheda di raccolta dati: verrai ricontattato per
              definire il modello di collaborazione più adatto a te.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/form-partner-manager?tipo=partner"
                className="rounded-full bg-[#1BA97F] px-5 py-3 text-white text-sm font-semibold shadow hover:brightness-110"
              >
                Compila la scheda Partner
              </Link>
            </div>
          </div>

          <div className="reveal rounded-2xl bg-[#F6F7F6] p-6 shadow-sm border border-black/5">
            <h3 className="text-lg font-semibold">
              A chi è pensato il programma Partner?
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-[#2B4A42]">
              <li>• Agenzie web e marketing</li>
              <li>• Consulenti business e commerciali</li>
              <li>• Professionisti che seguono più punti vendita</li>
              <li>
                • Chi vuole aggiungere un&apos;entrata ricorrente con i POS
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* DIVENTA PERSONAL MANAGER */}
      <section
        id="diventa-personal-manager"
        className="bg-[#0F3E34] text-white"
      >
        <div className="mx-auto max-w-6xl px-4 py-14 grid md:grid-cols-2 gap-10 items-center">
          <div className="reveal space-y-4">
            <h2 className="text-3xl sm:text-4xl font-semibold font-serif">
              Diventa Personal Manager
            </h2>
            <p className="text-white/90">
              Segui in modo dedicato un portafoglio di clienti: li aiuti a
              scegliere il POS giusto, a usare Pay Later e a sviluppare la loro
              presenza digitale. Crescono loro, cresci anche tu.
            </p>
            <ul className="space-y-2 text-sm text:white/80 text-white/80">
              <li>• Gestisci un numero selezionato di attività</li>
              <li>• Offri consulenza continuativa su pagamenti e digitale</li>
              <li>• Possibilità di fee ricorrenti sui volumi e sui progetti</li>
            </ul>
            <p className="text-xs text-white/60">
              Programma in evoluzione • Work in progress. I dettagli verranno
              definiti insieme in fase di colloquio.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/form-partner-manager?tipo=personal-manager"
                className="rounded-full bg.white text-[#0F3E34] px-5 py-3 text-sm font-semibold shadow hover:opacity-90 bg-white"
              >
                Candidati come Personal Manager
              </Link>
            </div>
          </div>

          <div className="reveal rounded-2xl bg-white/5 p-6 border border-white/10">
            <h3 className="text-lg font-semibold">Come funziona in pratica</h3>
            <ol className="mt-3 space-y-2 text-sm text-white/85 list-decimal list-inside">
              <li>Compili la scheda di candidatura con i tuoi dati.</li>
              <li>
                Valutiamo insieme il tuo territorio, i contatti e gli obiettivi.
              </li>
              <li>
                Definiamo un percorso di onboarding e formazione su Dojo, Pay
                Later e servizi web.
              </li>
              <li>
                Inizi a seguire i clienti come punto di riferimento unico per
                pagamenti e digitale.
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* SEZIONI DOJO ORIGINALI */}

      <section id="features" className="py-10">
        <div className="mx-auto max-w-6xl px-4 grid md:grid-cols-3 gap-6">
          {[
            {
              title: "Pagamenti veloci e affidabili",
              desc: "Transazioni rapidissime e uptime del 99,99%.",
              color: "bg-[#0E7D66]",
            },
            {
              title: "Bonifici in tempo reale",
              desc: "Avvisi quotidiani e tracciamento nell’app.",
              color: "bg-[#0B6B56]",
            },
            {
              title: "Assistenza clienti premiata",
              desc: "Team italiano, sempre: chat, email o telefono.",
              color: "bg-[#BFE6DA] text-[#0B2B23]",
            },
          ].map((c, i) => (
            <div
              key={i}
              className={`reveal rounded-2xl ${c.color} text-white p-6 shadow`}
            >
              <h3 className="text-lg font-semibold">{c.title}</h3>
              <p className="mt-2 text-sm opacity-90">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="vantaggi" className="py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="reveal max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-semibold">
              Innoviamo la tecnologia dei pagamenti
            </h2>
            <p className="mt-3 text-[#2B4A42]">
              Infrastruttura multi-cloud resiliente e scalabile. Tutto pensato
              per lavorare meglio, più in fretta e con meno errori.
            </p>
          </div>

          <div className="mt-8 grid md:grid-cols-2 gap-5">
            {[
              {
                title: "Dai maggiore valore alla tua offerta",
                desc: "Sincronizza il registratore di cassa al POS e riduci gli errori di battitura.",
                icon: "/images/icons/value.png",
              },
              {
                title: "Assistenza dall’inizio alla fine",
                desc: "Onboarding guidato, hub dedicato per lead e incentivi.",
                icon: "/images/icons/support.png",
              },
              {
                title: "Connettiti al cloud velocemente",
                desc: "API e integrazioni pronte per Windows, Linux, iOS, Android.",
                icon: "/images/icons/cloud.png",
              },
              {
                title: "Servi i clienti in tranquillità",
                desc: "Esperienza di pagamento eccezionale, sempre.",
                icon: "/images/icons/users.png",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="reveal rounded-2xl bg-white p-6 shadow-sm border border-black/5"
              >
                <div className="flex items-start gap-4">
                  <img src={f.icon} alt="" className="h-8 w-8" />
                  <div>
                    <h3 className="font-semibold">{f.title}</h3>
                    <p className="mt-1 text-sm text-[#2B4A42]">{f.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="reveal mt-12">
            <h3 className="text-2xl sm:text-3xl font-semibold">
              Cataloghi Dojo
            </h3>
            <p className="mt-2 text-[#2B4A42]">
              Sfoglia un’anteprima e scarica i cataloghi in PDF.
            </p>

            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "Modello 3", file: "/modello3.pdf" },
                { title: "Modello 4", file: "/modello4.pdf" },
                { title: "Modello 5", file: "/pdojo.pdf" },
              ].map(({ title, file }, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden flex flex-col"
                >
                  <div className="aspect-[4/5] bg-[#F6F7F6]">
                    <iframe
                      src={`${file}#view=FitH`}
                      title={`Anteprima ${title}`}
                      className="w-full h-full"
                    />
                  </div>

                  <div className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">{title}</div>
                      <div className="text-xs text-[#2B4A42]/70">
                        PDF • anteprima integrata
                      </div>
                    </div>
                    <a
                      href={file}
                      download
                      className="rounded-full bg-[#1BA97F] text-white px-4 py-2 text-sm font-medium hover:brightness-110"
                    >
                      Scarica
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            id="contatti"
            className="reveal mt-10 rounded-2xl bg-[#1BA97F] text-white px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4"
          >
            <p className="text-lg font-medium text-center md:text-left">
              Parla con noi di POS, Pay Later e servizi web
            </p>
            <Link
              to="/contact-form"
              className="rounded-full bg-white text-[#0B2B23] px-6 py-3 font-semibold shadow hover:opacity-90"
            >
              Contattaci
            </Link>
          </div>
        </div>
      </section>

      <section id="velocita" className="bg-[#114B3E] text-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="text-4xl font-semibold">
            Con Dojo la
            <br />
            velocità è di casa
          </h2>
          <div className="mt-6 rounded-[24px] overflow-hidden bg-black/10">
            <img
              src="/images/velocita.png"
              alt=""
              className="w-full h-[340px] object-cover"
            />
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 grid md:grid-cols-2 gap-10">
          <div>
            <h3 className="text-3xl font-semibold">
              Niente più attese con Dojo
            </h3>
          </div>
          <div className="text-[#2B4A42] space-y-3">
            <p>
              Nella ristorazione, il servizio è tutto. La velocità fa la
              differenza.
            </p>
            <p>
              I nostri POS si collegano al registratore di cassa per evitare
              doppi inserimenti, ridurre errori e risparmiare tempo e denaro.
            </p>
          </div>
        </div>
      </section>

      <section id="storie" className="bg-[#F6F7F6]">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-4xl font-semibold">
            Servi più clienti,
            <br />
            guadagna di più
          </h2>
          <p className="mt-3 text-[#2B4A42] max-w-2xl">
            Transazioni rapide, integrazioni smart e code sotto controllo.
          </p>

          <div className="mt-10 grid md:grid-cols-2 gap-8">
            <div className="bg-[#195E4E] text-white p-6 rounded-[28px]">
              <div className="-mt-16 mb-4">
                <img
                  src="/images/people/persona1.png"
                  alt=""
                  className="h-28 w-28 rounded-full object-cover ring-8 ring-[#F6F7F6]"
                />
              </div>
              <p className="text-xl font-medium">
                “Mi mancano le parole per descrivere Dojo. Sappiamo che possiamo
                fidarci.”
              </p>
              <p className="mt-3 text-white/80 text-sm">
                Daniele R., La Mia Mamma, Londra
              </p>
            </div>

            <div className="bg-[#BFE6DA] p-6 rounded-[28px]">
              <p className="text-xl font-medium">
                “L’app Dojo ci aiuta a capire i periodi più impegnativi e
                pianificare meglio.”
              </p>
              <p className="mt-3 text-[#2B4A42]/80 text-sm">
                Gurdeep R., Bank Street Bar, Glasgow
              </p>
              <div className="mt-6 flex justify-end">
                <img
                  src="/images/people/persona2.png"
                  alt=""
                  className="h-28 w-28 rounded-full object-cover ring-8 ring-white"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="piu-di-un-pos" className="bg-[#0F3E34] text-white">
        <div className="mx-auto max-w-6xl px-4 py-12 grid md:grid-cols-2 gap-8 items-start">
          <div className="rounded-[28px] p-6">
            <img
              src="/images/piudipos.png"
              alt=""
              className="w-full rounded-[20px]"
            />
          </div>

          <div className="space-y-5">
            <h2 className="text-4xl font-semibold">Molto più di un POS</h2>
            <div className="space-y-4">
              {[
                {
                  Icon: ShieldCheckIcon,
                  title: "Crittografia P2PE",
                  desc: "Standard di riferimento per la sicurezza dei dati delle carte.",
                },
                {
                  Icon: BoltIcon,
                  title: "Monitoraggio frodi in tempo reale",
                  desc: "Rilevamento automatico con risposta in millisecondi.",
                },
                {
                  Icon: BanknotesIcon,
                  title: "Bonifici il giorno successivo",
                  desc: "Incassi sommati e trasferiti entro le 10:00.",
                },
                {
                  Icon: ArrowPathIcon,
                  title: "Sostituzione rapida POS",
                  desc: "Se non risolviamo da remoto, sostituiamo entro 48 ore.",
                },
              ].map(({ Icon, title, desc }, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-2xl bg-white/10 p-4"
                >
                  <Icon className="h-6 w-6 flex-none" />
                  <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="text-white/80 text-sm">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-[24px] overflow-hidden">
              <img
                src="/images/piudipos2.png"
                alt=""
                className="w-full h-[220px] object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section id="vendite-realtime" className="bg-[#F6F7F6]">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div>
              <h2 className="text-4xl font-semibold">
                Vedi le tue vendite in tempo reale
              </h2>
              <div className="mt-6 rounded-[24px] overflow-hidden">
                <img
                  src="/images/vendite-realtime-hero.png"
                  alt=""
                  className="w-full h-[300px] object-cover"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  Icon: FunnelIcon,
                  title: "Filtri personalizzati",
                  desc: "Metodo di pagamento, circuito, data, ecc. per riconciliazioni rapide.",
                },
                {
                  Icon: ChartBarIcon,
                  title: "Transazioni live",
                  desc: "Panoramica di vendite, rimborsi e operazioni rifiutate.",
                },
                {
                  Icon: BanknotesIcon,
                  title: "Traccia i bonifici",
                  desc: "Notifiche istantanee quando i fondi sono pagati.",
                },
                {
                  Icon: DocumentChartBarIcon,
                  title: "Report mensili",
                  desc: "Fatture e analisi commissioni in un unico posto.",
                },
                {
                  Icon: ClipboardDocumentListIcon,
                  title: "Gestione centralizzata",
                  desc: "Pagamenti in un solo posto e riconciliazione semplice.",
                },
                {
                  Icon: BellAlertIcon,
                  title: "Avvisi smart",
                  desc: "Alert utili per gestire al meglio il flusso di cassa.",
                },
              ].map(({ Icon, title, desc }, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg.white p-4 shadow-sm border border-black/5 bg-white"
                >
                  <Icon className="h-6 w-6 text-[#0B6B56]" />
                  <h3 className="mt-2 font-semibold">{title}</h3>
                  <p className="text-sm text-[#2B4A42] mt-1">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="nps" className="bg-[#F6F7F6]">
        <div className="mx-auto max-w-6xl px-4 py-12 space-y-8">
          <div className="rounded-[28px] bg-[#FFD0C5] p-6">
            <h3 className="text-2xl font-semibold">Net Promoter Score</h3>
            <div className="mt-5 space-y-4">
              {[
                { label: "DOJO", val: 70, bar: "bg-[#741C42]" },
                { label: "Tech disruptors", val: 61, bar: "bg-[#94305C]" },
                {
                  label: "Incumbents",
                  val: 44,
                  bar: "bg-white text-[#741C42] border border-[#741C42]",
                },
              ].map((r, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium">{r.label}</span>
                    <span>{r.val}</span>
                  </div>
                  <div className="h-5 rounded-full bg-white/60">
                    <div
                      className={`h-5 rounded-full ${r.bar}`}
                      style={{ width: `${r.val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-[#0B2B23]/70">
              1. Valutazioni Trustpilot al 20 giugno 2023. 2. Dati NPS ponderati
              da Local Data Company.
            </p>
          </div>
        </div>
      </section>

      <footer className="py-10 border-t border-black/5 bg-white">
        <div className="mx-auto max-w-6xl px-4 text-sm text-[#2B4A42]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <img src="/images/logo.png" alt="Dojo" className="h-15" />
            <div className="flex items-center gap-3 opacity-70">
              <span>© {new Date().getFullYear()} Dojo</span>
              <span>•</span>
              <a href="#" className="hover:opacity-80">
                Privacy
              </a>
              <a href="#" className="hover:opacity-80">
                Cookie
              </a>
              <a href="#" className="hover:opacity-80">
                Termini
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
