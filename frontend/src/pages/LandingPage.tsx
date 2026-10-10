import { useRef } from "react";
import { Link } from "react-router-dom";
import { Mic, Brain, Shield, Eye, ChevronRight, Mail, MapPin, Phone, ArrowRight, Star, Users, Award, Zap } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useI18n } from "../i18n";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const NAV_LINKS = [
  { label: "Home", href: "#hero" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how" },
  { label: "About", href: "#about" },
  { label: "Team", href: "#team" },
  { label: "Contact", href: "#contact" },
];

const TEAM = [
  { name: "Ahmed Salem", role: "Team Leader", initials: "AS" },
  { name: "Afaf Walid", role: "Developer", initials: "AW" },
  { name: "Mohamed Gamal", role: "Developer", initials: "MG" },
  { name: "Roqaia Mohamed", role: "Developer", initials: "RM" },
];

const FEATURES = [
  { icon: Mic, title: "Speech Recognition", desc: "Real-time voice transcription powered by OpenAI Whisper for accurate answer capture." },
  { icon: Brain, title: "NLP Grading", desc: "Sentence-BERT evaluates answer quality, relevance, and depth with AI precision." },
  { icon: Eye, title: "Vision Monitoring", desc: "YOLOv8 + MediaPipe detect cheating behavior through facial and gaze analysis." },
  { icon: Shield, title: "Anti-Cheat System", desc: "Multi-layered integrity checks ensure fair examination for all students." },
];

const STEPS = [
  { num: "01", title: "Create Exam", desc: "Lecturers build question banks with difficulty levels and time limits." },
  { num: "02", title: "Invite Students", desc: "Share a unique exam link — students join with one click." },
  { num: "03", title: "AI Monitors", desc: "Speech, vision, and NLP engines work together in real-time." },
  { num: "04", title: "Instant Results", desc: "Automated grading with detailed analytics and feedback." },
];

const STATS = [
  { value: "3+", label: "AI Models", icon: Zap },
  { value: "95%", label: "Accuracy", icon: Award },
  { value: "<2s", label: "Response", icon: Star },
  { value: "500+", label: "Exams", icon: Users },
];

export default function LandingPage() {
  const { dir } = useI18n();
  const pageRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Hero animations
    gsap.from(".hero-title span", { y: 80, opacity: 0, stagger: 0.15, duration: 1, ease: "power3.out", delay: 0.3 });
    gsap.from(".hero-sub", { y: 30, opacity: 0, duration: 0.8, delay: 0.9, ease: "power2.out" });
    gsap.from(".hero-cta", { y: 20, opacity: 0, stagger: 0.1, duration: 0.6, delay: 1.2, ease: "power2.out" });
    gsap.from(".hero-stat-item", { y: 20, opacity: 0, stagger: 0.08, duration: 0.5, delay: 1.5 });

    // Scroll animations
    gsap.utils.toArray<HTMLElement>(".fade-up").forEach((el) => {
      gsap.from(el, { y: 50, opacity: 0, duration: 0.8, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 85%" } });
    });
    gsap.utils.toArray<HTMLElement>(".fade-up-stagger").forEach((el) => {
      gsap.from(el.children, { y: 40, opacity: 0, stagger: 0.1, duration: 0.6, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 85%" } });
    });
  }, { scope: pageRef });

  const scrollTo = (id: string) => {
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div ref={pageRef} style={{ background: "#0a0a0a", color: "#f0f0f0", fontFamily: "'Inter', sans-serif" }}>

      {/* ═══ NAVBAR ═══ */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "rgba(10,10,10,0.85)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 clamp(1.5rem, 4vw, 4rem)", height: 70,
      }}>
        <span style={{ fontFamily: "'Antonio', sans-serif", fontSize: "1.6rem", fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          ORALIQ
        </span>
        <div className="hidden md:flex" style={{ gap: "2.5rem", alignItems: "center" }}>
          {NAV_LINKS.map(l => (
            <button key={l.href} onClick={() => scrollTo(l.href)} style={{
              background: "none", border: "none", color: "rgba(255,255,255,0.4)",
              fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", textTransform: "uppercase",
              letterSpacing: "0.1em", fontFamily: "'Antonio', sans-serif", transition: "color 0.2s",
            }} className="hover:!text-white">{l.label}</button>
          ))}
        </div>
        <Link to="/login" style={{
          padding: "0.55rem 1.5rem", background: "#fff", color: "#0a0a0a",
          borderRadius: "0.5rem", fontFamily: "'Antonio', sans-serif", fontWeight: 700,
          fontSize: "0.8rem", textDecoration: "none", textTransform: "uppercase",
          letterSpacing: "0.06em", transition: "transform 0.2s",
        }} className="hover:scale-105">
          Sign In
        </Link>
      </nav>

      {/* ═══ HERO ═══ */}
      <section id="hero" style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center", textAlign: "center",
        position: "relative", overflow: "hidden",
        padding: "8rem 2rem 4rem",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "url(/images/landing-hero.png)",
          backgroundSize: "cover", backgroundPosition: "center",
          opacity: 0.2, pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at center, transparent 0%, #0a0a0a 75%)",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 900 }}>
          <p style={{
            fontFamily: "'Antonio', sans-serif", fontSize: "0.85rem", fontWeight: 700,
            letterSpacing: "0.3em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase",
            marginBottom: "2rem",
          }}>AI-POWERED EDUCATION PLATFORM</p>

          <h1 className="hero-title" style={{
            fontFamily: "'Antonio', sans-serif",
            fontSize: "clamp(4rem, 12vw, 11rem)",
            fontWeight: 700, lineHeight: 0.9, textTransform: "uppercase",
            letterSpacing: "0.04em", marginBottom: "2rem",
          }}>
            <span style={{ display: "block", color: "#fff" }}>SMART</span>
            <span style={{ display: "block", color: "#fff" }}>ORAL</span>
            <span style={{ display: "block", color: "rgba(255,255,255,0.12)" }}>EXAMS</span>
          </h1>

          <p className="hero-sub" style={{
            fontSize: "1.15rem", color: "rgba(255,255,255,0.35)", maxWidth: 550,
            margin: "0 auto 2.5rem", lineHeight: 1.7,
          }}>
            Conduct, analyze, and grade oral assessments with cutting-edge AI. Vision, NLP, and Speech — all in one platform.
          </p>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/register" className="hero-cta" style={{
              padding: "1rem 2.5rem", background: "#fff", color: "#0a0a0a",
              borderRadius: "0.6rem", fontFamily: "'Antonio', sans-serif", fontWeight: 700,
              fontSize: "0.95rem", textDecoration: "none", textTransform: "uppercase",
              letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: "0.5rem",
              transition: "transform 0.2s, box-shadow 0.2s",
            }} >
              Get Started <ArrowRight size={16} />
            </Link>
            <button onClick={() => scrollTo("#features")} className="hero-cta" style={{
              padding: "1rem 2.5rem", background: "transparent",
              border: "1px solid rgba(255,255,255,0.15)", color: "#fff",
              borderRadius: "0.6rem", fontFamily: "'Antonio', sans-serif", fontWeight: 700,
              fontSize: "0.95rem", cursor: "pointer", textTransform: "uppercase",
              letterSpacing: "0.06em", transition: "all 0.2s",
            }}>
              Learn More
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="fade-up-stagger" style={{
          position: "relative", zIndex: 1, display: "flex", gap: "3rem",
          marginTop: "5rem", flexWrap: "wrap", justifyContent: "center",
        }}>
          {STATS.map(({ value, label, icon: Icon }, i) => (
            <div key={i} className="hero-stat-item" style={{ textAlign: "center" }}>
              <Icon size={16} color="rgba(255,255,255,0.2)" style={{ marginBottom: "0.5rem" }} />
              <p style={{ fontFamily: "'Antonio', sans-serif", fontSize: "2.5rem", fontWeight: 700, color: "#fff" }}>{value}</p>
              <p style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.15em" }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Scrolling strip */}
        <div style={{
          position: "absolute", bottom: 0, left: "-2%", right: "-2%",
          overflow: "hidden", background: "#fff", padding: "0.6rem 0",
        }}>
          <div style={{ display: "inline-flex", animation: "marquee 30s linear infinite", whiteSpace: "nowrap" }}>
            {[...Array(5)].map((_, i) => (
              <span key={i} style={{
                fontFamily: "'Antonio', sans-serif", fontSize: "0.95rem", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.05em", color: "#0a0a0a", padding: "0 2rem",
              }}>
                ORALIQ&nbsp;&nbsp;•&nbsp;&nbsp;VISION&nbsp;&nbsp;•&nbsp;&nbsp;NLP&nbsp;&nbsp;•&nbsp;&nbsp;SPEECH&nbsp;&nbsp;•&nbsp;&nbsp;AI POWERED&nbsp;&nbsp;•&nbsp;&nbsp;
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" style={{ padding: "8rem clamp(1.5rem, 4vw, 6rem)", maxWidth: 1200, margin: "0 auto" }}>
        <div className="fade-up" style={{ textAlign: "center", marginBottom: "4rem" }}>
          <p style={{ fontFamily: "'Antonio', sans-serif", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.25em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", marginBottom: "1rem" }}>CORE FEATURES</p>
          <h2 style={{ fontFamily: "'Antonio', sans-serif", fontSize: "clamp(2.5rem, 6vw, 5rem)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", lineHeight: 0.95 }}>
            <span style={{ color: "#fff" }}>POWERED BY</span><br />
            <span style={{ color: "rgba(255,255,255,0.12)" }}>INTELLIGENCE</span>
          </h2>
        </div>
        <div className="fade-up-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.25rem" }}>
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <div key={i} style={{
              background: "#111", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "1.25rem", padding: "2rem 1.75rem",
              transition: "border-color 0.3s, transform 0.3s",
            }} className="hover:border-white/[0.15] hover:-translate-y-1">
              <div style={{
                width: 48, height: 48, borderRadius: "0.8rem",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5rem",
              }}>
                <Icon size={20} color="#fff" />
              </div>
              <h3 style={{ fontFamily: "'Antonio', sans-serif", fontSize: "1.4rem", fontWeight: 700, color: "#fff", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.02em" }}>{title}</h3>
              <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.3)", lineHeight: 1.7 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how" style={{ padding: "6rem clamp(1.5rem, 4vw, 6rem)", background: "#0d0d0d", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="fade-up" style={{ textAlign: "center", marginBottom: "4rem" }}>
            <p style={{ fontFamily: "'Antonio', sans-serif", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.25em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", marginBottom: "1rem" }}>PROCESS</p>
            <h2 style={{ fontFamily: "'Antonio', sans-serif", fontSize: "clamp(2.5rem, 6vw, 5rem)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>HOW IT WORKS</h2>
          </div>
          <div className="fade-up-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem" }}>
            {STEPS.map(({ num, title, desc }, i) => (
              <div key={i} style={{ padding: "2rem 1.5rem", position: "relative" }}>
                <span style={{ fontFamily: "'Antonio', sans-serif", fontSize: "4rem", fontWeight: 700, color: "rgba(255,255,255,0.04)", position: "absolute", top: "0.5rem", right: "1rem", lineHeight: 1 }}>{num}</span>
                <div style={{ width: 40, height: 2, background: "#fff", marginBottom: "1.5rem" }} />
                <h3 style={{ fontFamily: "'Antonio', sans-serif", fontSize: "1.3rem", fontWeight: 700, color: "#fff", marginBottom: "0.5rem", textTransform: "uppercase" }}>{title}</h3>
                <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.3)", lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ABOUT ═══ */}
      <section id="about" style={{ padding: "8rem clamp(1.5rem, 4vw, 6rem)", maxWidth: 1200, margin: "0 auto" }}>
        <div className="fade-up" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "3rem", alignItems: "center" }}>
          <div>
            <p style={{ fontFamily: "'Antonio', sans-serif", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.25em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", marginBottom: "1rem" }}>ABOUT ORALIQ</p>
            <h2 style={{ fontFamily: "'Antonio', sans-serif", fontSize: "clamp(2.5rem, 6vw, 5rem)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "1.5rem", lineHeight: 0.95 }}>
              <span style={{ color: "#fff" }}>REDEFINING</span><br />
              <span style={{ color: "rgba(255,255,255,0.12)" }}>ORAL ASSESSMENT</span>
            </h2>
            <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.8, marginBottom: "1.5rem", maxWidth: 650 }}>
              OralIQ is an AI-powered smart oral examination platform designed for modern education.
              We combine Speech Recognition (Whisper), Natural Language Processing (SBERT),
              and Computer Vision (YOLOv8 + MediaPipe) to create a comprehensive, fair, and efficient exam experience.
            </p>
            <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.8, marginBottom: "2rem", maxWidth: 650 }}>
              Built by a team of passionate engineers, OralIQ automates the entire oral exam lifecycle —
              from question creation and student invitation to real-time monitoring and AI-powered grading.
            </p>
            <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
              {[["React + Vite", "Frontend"], ["FastAPI", "Backend"], ["3 AI Models", "Intelligence"]].map(([v, l], i) => (
                <div key={i}>
                  <p style={{ fontFamily: "'Antonio', sans-serif", fontSize: "1.3rem", fontWeight: 700, color: "#fff" }}>{v}</p>
                  <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.12em" }}>{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA STRIP ═══ */}
      <div style={{ overflow: "hidden", background: "#fff", padding: "0.7rem 0", transform: "rotate(-1deg)", margin: "0 -2%" }}>
        <div style={{ display: "inline-flex", animation: "marquee 35s linear infinite", whiteSpace: "nowrap" }}>
          {[...Array(5)].map((_, i) => (
            <span key={i} style={{ fontFamily: "'Antonio', sans-serif", fontSize: "1.2rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#0a0a0a", padding: "0 2.5rem" }}>
              GET STARTED TODAY&nbsp;&nbsp;•&nbsp;&nbsp;FREE TO USE&nbsp;&nbsp;•&nbsp;&nbsp;AI POWERED GRADING&nbsp;&nbsp;•&nbsp;&nbsp;
            </span>
          ))}
        </div>
      </div>

      {/* ═══ TEAM ═══ */}
      <section id="team" style={{ padding: "6rem clamp(1.5rem, 4vw, 6rem)", background: "#0d0d0d", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="fade-up" style={{ textAlign: "center", marginBottom: "4rem" }}>
            <p style={{ fontFamily: "'Antonio', sans-serif", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.25em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", marginBottom: "1rem" }}>THE PEOPLE BEHIND ORALIQ</p>
            <h2 style={{ fontFamily: "'Antonio', sans-serif", fontSize: "clamp(2.5rem, 6vw, 5rem)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>OUR TEAM</h2>
          </div>
          <div className="fade-up-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
            {TEAM.map(({ name, role, initials }, i) => (
              <div key={i} style={{
                background: "#111", border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "1.25rem", padding: "2.5rem 1.5rem", textAlign: "center",
                transition: "border-color 0.3s, transform 0.3s",
              }} className="hover:border-white/[0.15] hover:-translate-y-1">
                <div style={{
                  width: 70, height: 70, borderRadius: "50%",
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 1.25rem",
                  fontFamily: "'Antonio', sans-serif", fontSize: "1.5rem", fontWeight: 700,
                  color: "#fff", letterSpacing: "0.06em",
                }}>{initials}</div>
                <h3 style={{ fontFamily: "'Antonio', sans-serif", fontSize: "1.2rem", fontWeight: 700, color: "#fff", marginBottom: "0.3rem", textTransform: "uppercase" }}>{name}</h3>
                <p style={{ fontFamily: "'Antonio', sans-serif", fontSize: "0.7rem", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.15em" }}>{role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CONTACT ═══ */}
      <section id="contact" style={{ padding: "8rem clamp(1.5rem, 4vw, 6rem)", maxWidth: 1200, margin: "0 auto" }}>
        <div className="fade-up" style={{ textAlign: "center", marginBottom: "4rem" }}>
          <p style={{ fontFamily: "'Antonio', sans-serif", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.25em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", marginBottom: "1rem" }}>GET IN TOUCH</p>
          <h2 style={{ fontFamily: "'Antonio', sans-serif", fontSize: "clamp(2.5rem, 6vw, 5rem)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>CONTACT US</h2>
        </div>
        <div className="fade-up-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
          {[
            { icon: Mail, title: "Email", detail: "ahmedsalem250500@gmail.com", sub: "We reply within 24 hours" },
            { icon: Phone, title: "Phone", detail: "+20 106 540 7502", sub: "Sun - Thu, 9am - 5pm" },
            { icon: MapPin, title: "Location", detail: "Mansoura, Egypt", sub: "Faculty of Computer Science" },
          ].map(({ icon: Icon, title, detail, sub }, i) => (
            <div key={i} style={{
              background: "#111", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "1.25rem", padding: "2.5rem 1.75rem", textAlign: "center",
              transition: "border-color 0.3s",
            }} className="hover:border-white/[0.15]">
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 1.25rem",
              }}>
                <Icon size={22} color="#fff" />
              </div>
              <h3 style={{ fontFamily: "'Antonio', sans-serif", fontSize: "0.85rem", fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "0.5rem" }}>{title}</h3>
              <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "#fff", marginBottom: "0.3rem" }}>{detail}</p>
              <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.2)" }}>{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.04)", padding: "3rem clamp(1.5rem, 4vw, 6rem)",
        background: "#0d0d0d",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1.5rem" }}>
          <div>
            <span style={{ fontFamily: "'Antonio', sans-serif", fontSize: "1.3rem", fontWeight: 700, color: "#fff", textTransform: "uppercase" }}>ORALIQ</span>
            <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.15)", marginTop: "0.35rem" }}>Smart Oral Exams for Modern Education</p>
          </div>
          <div style={{ display: "flex", gap: "2rem" }}>
            {NAV_LINKS.map(l => (
              <button key={l.href} onClick={() => scrollTo(l.href)} style={{
                background: "none", border: "none", color: "rgba(255,255,255,0.2)",
                fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", textTransform: "uppercase",
                letterSpacing: "0.08em", fontFamily: "'Antonio', sans-serif",
              }}>{l.label}</button>
            ))}
          </div>
          <p style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.1)", width: "100%", textAlign: "center", marginTop: "1rem" }}>
            © 2026 OralIQ. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
