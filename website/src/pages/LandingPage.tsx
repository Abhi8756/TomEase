import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Leaf, Zap, Shield, BarChart3, ArrowRight, Camera, Brain, Sparkles } from 'lucide-react';

const fadeUp: any = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' } }),
};

const features = [
  { icon: Camera, title: 'Snap & Detect', desc: 'Upload any tomato leaf photo. AI identifies disease in under 2 seconds with 90%+ field accuracy.', color: 'text-primary-400' },
  { icon: Brain, title: 'GradCAM Heatmap', desc: 'See exactly where on the leaf the AI detected disease. No black box — full transparency.', color: 'text-blue-400' },
  { icon: Zap, title: 'Instant Diagnosis', desc: 'Early Blight, Late Blight, Leaf Mold, Septoria, TYLCV — detected and treated before spreading.', color: 'text-amber-400' },
  { icon: Shield, title: 'Treatment Guide', desc: 'Specific, actionable treatment recommendations per disease. No guesswork, no wasted money.', color: 'text-purple-400' },
  { icon: BarChart3, title: 'Scan History', desc: 'Track every scan. Filter by disease, date, severity. See patterns before they become problems.', color: 'text-rose-400' },
  { icon: Sparkles, title: 'Field Accuracy 90.2%', desc: 'Validated on real field photos — not just clean lab images. Trained with ResNet50 + SupCon.', color: 'text-cyan-400' },
];

const diseases = [
  { name: 'Early Blight', color: '#f59e0b', risk: 'Medium' },
  { name: 'Late Blight', color: '#ef4444', risk: 'High' },
  { name: 'Leaf Mold', color: '#8b5cf6', risk: 'Medium' },
  { name: 'Septoria', color: '#f97316', risk: 'Medium' },
  { name: 'TYLCV', color: '#ec4899', risk: 'Critical' },
  { name: 'Healthy', color: '#10b981', risk: 'None' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500/20 rounded-lg border border-primary-500/30 flex items-center justify-center">
              <Leaf className="w-4 h-4 text-primary-400" />
            </div>
            <span className="font-bold text-white text-lg">Tom<span className="text-primary-400">Ease</span></span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Sign in</Link>
            <Link to="/login" className="btn-primary text-sm py-2 px-5">Get Started Free</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 grid-pattern">
        {/* Background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] 
                      bg-primary-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto px-6 py-24 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 
                           border border-primary-500/30 text-primary-400 text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              90.2% Field Accuracy · Powered by ResNet50 + SupCon
            </span>
          </motion.div>

          <motion.h1 initial="hidden" animate="visible" variants={fadeUp} custom={1}
            className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-tight mb-6">
            Detect Tomato Diseases
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600">
              Before They Spread
            </span>
          </motion.h1>

          <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={2}
            className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload a leaf photo. Get an AI diagnosis in 2 seconds. See exactly where the disease is.
            Get targeted treatment recommendations. Save your crop.
          </motion.p>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3}
            className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login"
              className="btn-primary flex items-center justify-center gap-2 text-base py-4 px-8 group">
              Start Scanning Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#features"
              className="btn-secondary flex items-center justify-center gap-2 text-base py-4 px-8">
              See How It Works
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}
            className="flex flex-wrap justify-center gap-8 mt-16">
            {[
              { value: '90.2%', label: 'Field Accuracy' },
              { value: '< 2s', label: 'Detection Speed' },
              { value: '6', label: 'Disease Classes' },
              { value: '100%', label: 'Free to Use' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-3xl font-black text-primary-400">{value}</div>
                <div className="text-sm text-gray-500 mt-1">{label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Disease Classes Preview */}
      <section className="py-16 bg-dark-800/30">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-gray-500 text-sm font-medium mb-8 uppercase tracking-widest">
            Detects All Major Tomato Diseases
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {diseases.map(({ name, color, risk }) => (
              <div key={name}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 
                         hover:bg-white/10 transition-colors cursor-default">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-sm font-medium text-gray-300">{name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" 
                  style={{ color, backgroundColor: `${color}20`, border: `1px solid ${color}40` }}>
                  {risk}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">Everything You Need</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Built for farmers who can't afford to guess.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc, color }, i) => (
              <motion.div key={title}
                initial="hidden" whileInView="visible" viewport={{ once: true }} 
                variants={fadeUp} custom={i * 0.05}
                className="glass-hover p-6 group">
                <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4 
                              group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-dark-800/30">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">How It Works</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Upload a Photo', desc: 'Drag and drop any tomato leaf photo. Works with phone photos, blurry images, field conditions.' },
              { step: '02', title: 'AI Analyzes', desc: 'Our ResNet50 model processes the image. GradCAM highlights the exact disease region on the leaf.' },
              { step: '03', title: 'Get Treatment', desc: 'Receive a diagnosis with confidence score, severity level, and specific treatment recommendations.' },
            ].map(({ step, title, desc }, i) => (
              <motion.div key={step} initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={i * 0.1} className="text-center">
                <div className="text-6xl font-black text-primary-500/20 mb-4">{step}</div>
                <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
                <p className="text-gray-400 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <h2 className="text-4xl font-black text-white mb-6">
              Ready to Protect Your Crop?
            </h2>
            <p className="text-gray-400 text-lg mb-8">
              Free to use. No credit card. Start detecting diseases in under a minute.
            </p>
            <Link to="/login"
              className="btn-primary text-lg py-4 px-10 inline-flex items-center gap-2 group">
              Create Free Account
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Leaf className="w-4 h-4 text-primary-400" />
            <span className="text-gray-500 text-sm">TomEase © 2026 · AI Tomato Disease Detection</span>
          </div>
          <div className="flex items-center gap-6 text-gray-500 text-sm">
            <span>Built with ResNet50 + SupCon</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
