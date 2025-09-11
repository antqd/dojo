// App.jsx
import React, { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Link } from "react-router-dom";

// icone (gratis) per le card e le sezioni
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

  useGSAP(
    () => {
      // hero entrance
      gsap.from(".hero-stagger", {
        opacity: 0,
        y: 24,
        duration: 0.8,
        stagger: 0.12,
        ease: "power2.out",
      });

      // float effect on device
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

      // cards reveal on scroll
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

  return (
    <div ref={root} className="min-h-screen bg-[#F6F7F6] text-[#0B2B23]">
      {/* NAVBAR */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-black/5">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/images/logo.png" alt="DOJO" className="h-8" />
            <span className="sr-only">Dojo</span>
          </div>

          {/* +++ aggiunte voci anchor, tutto one-page +++ */}
          <div className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="hover:opacity-80">
              Funzioni
            </a>
            <a href="#vantaggi" className="hover:opacity-80">
              Vantaggi
            </a>
            <a href="#velocita" className="hover:opacity-80">
              Velocità
            </a>
            <a href="#storie" className="hover:opacity-80">
              Storie
            </a>
            <a href="#piu-di-un-pos" className="hover:opacity-80">
              Più di un POS
            </a>
            <a href="#vendite-realtime" className="hover:opacity-80">
              Vendite
            </a>
            <a href="#nps" className="hover:opacity-80">
              NPS
            </a>
            <a href="#contatti" className="hover:opacity-80">
              Contatti
            </a>
          </div>

          <Link
            to="/compiler-dojo"
            className="rounded-full bg-[#1BA97F] px-4 py-2 text-white text-sm font-medium shadow hover:brightness-110"
          >
            Attiva Dojo
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* blob decor */}
        <div className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-[#1BA97F]/10 blur-3xl" />
        <div className="mx-auto max-w-6xl px-4 grid lg:grid-cols-2 gap-10 items-center py-16">
          <div>
            <p className="hero-stagger text-xs uppercase tracking-[0.2em] text-[#1BA97F] mb-3">
              Pagamenti smart • POS Cloud
            </p>
            <h1 className="hero-stagger text-4xl sm:text-5xl font-semibold leading-tight text-[#0B2B23]">
              Unisciti alla <span className="text-[#1BA97F]">rivoluzione</span>
              <br />
              dei pagamenti
            </h1>
            <p className="hero-stagger mt-4 text-base text-[#2B4A42] max-w-xl">
              Dall’integrazione cloud ai POS di ultima generazione, fino a un
              servizio clienti premiato: ti diamo gli strumenti per crescere.
            </p>

            {/* badge carte */}
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

            <div className="hero-stagger mt-8 flex gap-3">
              <Link
                to="/form-partner-manager"
                className="rounded-full bg-[#1BA97F] px-5 py-3 text-white font-medium shadow hover:brightness-110"
              >
                Diventa Referral Partner 
              </Link>
              <a
                href="#features"
                className="rounded-full px-5 py-3 border border-[#1BA97F] text-[#1BA97F] font-medium hover:bg-[#1BA97F]/5"
              >
                Scopri di più
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

      {/* PILLARS */}
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

      {/* VANTAGGI 4 CARDS */}
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

          {/* CTA banner */}
          <div
            id="contatti"
            className="reveal mt-10 rounded-2xl bg-[#1BA97F] text-white px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4"
          >
            <p className="text-lg font-medium text-center md:text-left">
              Chiedi subito al tuo Referral Partner
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

      {/* ====== NUOVE SEZIONI (ONE-PAGE) ====== */}

      {/* 1) VELOCITA */}
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

      {/* 2) STORIE / TESTIMONIANZE */}
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

      {/* 3) PIU DI UN POS */}
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

      {/* 4) VENDITE REALTIME */}
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
                  className="rounded-2xl bg-white p-4 shadow-sm border border-black/5"
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

      {/* 5) NPS / TRUSTPILOT */}
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

      {/* FOOTER */}
      <footer className="py-10 border-t border-black/5 bg-white">
        <div className="mx-auto max-w-6xl px-4 text-sm text-[#2B4A42]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <img src="/images/logo.png" alt="Dojo" className="h-5" />
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
          <p className="mt-4 opacity-70 max-w-3xl">
            Paymentsense Ireland Limited opera come Dojo, istituto di moneta
            elettronica regolato dalla Banca Centrale d’Irlanda. Le integrazioni
            illustrate sono a scopo dimostrativo.
          </p>
        </div>
      </footer>
    </div>
  );
}
