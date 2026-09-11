import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Check, Sparkles, Zap, Shield, Rocket,
  Film, Layers, Cpu, Clock, HelpCircle,
  ArrowRight, Info
} from 'lucide-react'

const PLANS = [
  {
    name: 'Free',
    tagline: 'Explore the power of cinematic AI.',
    price: '0',
    tokens: '500',
    features: [
      'Standard 1080p Export',
      'Scene-by-Scene Control',
      'Basic AI Agent access',
      'Community Support',
    ],
    cta: 'Start Creating',
    primary: false,
    icon: <Film size={24} />,
    color: 'plan-free'
  },
  {
    name: 'Pro',
    tagline: 'For professional creators and directors.',
    price: '29',
    tokens: '10,000',
    features: [
      'Cinematic 4K Export',
      'Priority GPU Rendering',
      'Advanced AI Director Agent',
      'Unlimited Storyboard Space',
      'Commercial License',
      'Priority Email Support',
    ],
    cta: 'Get Pro Access',
    primary: true,
    popular: true,
    icon: <Rocket size={24} />,
    color: 'plan-pro'
  },
  {
    name: 'Enterprise',
    tagline: 'Custom solutions for studios and teams.',
    price: 'Custom',
    tokens: 'Unlimited',
    features: [
      '8K Ultra-HD Export',
      'Dedicated Render Node',
      'API Access for Pipelines',
      'Custom Model Fine-tuning',
      'SLA & Account Manager',
    ],
    cta: 'Contact Sales',
    primary: false,
    icon: <Shield size={24} />,
    color: 'plan-enterprise'
  }
]

const TOKEN_PACKS = [
  { amount: '1,000', price: '9', per: '0.9¢/token' },
  { amount: '5,000', price: '39', per: '0.7¢/token', popular: true },
  { amount: '12,000', price: '79', per: '0.6¢/token' },
]

export default function Pricing() {
  return (
    <div className="pricing-page">
      <div className="pricing-container">

        <header className="pricing-header">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pricing-badge"
          >
            <Sparkles size={14} /> SIMPLE TRANSPARENT PRICING
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="pricing-title"
          >
            Fuel Your <span className="pricing-title--accent">Cinematic Vision.</span>
          </motion.h1>
          <p className="pricing-subtitle">
            Choose the plan that fits your production scale. All plans include access to our cutting-edge cinematic engine.
          </p>
        </header>

        {/* --- Plans Grid --- */}
        <div className="pricing-grid">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.6 }}
              className={`pricing-card glass-panel ${plan.popular ? 'pricing-card--highlight' : ''}`}
            >
              {plan.popular && <div className="pricing-popular-badge">MOST POPULAR</div>}

              <div className={`pricing-plan-icon ${plan.color}`}>{plan.icon}</div>
              <h3 className="pricing-plan-name">{plan.name}</h3>
              <p className="pricing-plan-tagline">{plan.tagline}</p>

              <div className="pricing-price-row">
                {plan.price !== 'Custom' && <span className="pricing-period">$</span>}
                <span className="pricing-price">{plan.price}</span>
                {plan.price !== 'Custom' && <span className="pricing-period">/mo</span>}
              </div>

              <div className="pricing-token-chip">
                <Zap size={14} /> {plan.tokens} Tokens Included
              </div>

              <ul className="pricing-features">
                {plan.features.map(f => (
                  <li key={f} className="pricing-feature-item">
                    <Check size={16} className="pricing-check" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/login"
                className={`pricing-cta-btn ${plan.primary ? 'pricing-cta-btn--primary' : ''}`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>

        {/* --- Token Packs --- */}
        <section className="token-packs-section">
          <h2 className="token-packs-title">Need more tokens?</h2>
          <p className="token-packs-sub">Top up your balance instantly with one-time credit packs.</p>

          <div className="token-packs-grid">
            {TOKEN_PACKS.map((pack, i) => (
              <motion.div
                key={pack.amount}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`token-pack-card glass-panel ${pack.popular ? 'token-pack-card--popular' : ''}`}
              >
                {pack.popular && <div className="token-pack-popular">BEST VALUE</div>}
                <div className="token-pack-amount">{pack.amount} <small>Tokens</small></div>
                <div className="token-pack-price">${pack.price}</div>
                <div className="token-pack-per">{pack.per}</div>
                <button className="pricing-cta-btn">Buy Pack</button>
              </motion.div>
            ))}
          </div>
        </section>

        {/* --- Token Explainer --- */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="token-explainer glass-panel"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <HelpCircle size={22} style={{ color: 'var(--accent-violet)' }} />
            <h3 style={{ margin: 0 }}>How do tokens work?</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '25px', maxWidth: '700px' }}>
            Tokens are the currency of Nexoryx. They power the compute required to generate your cinematic visions.
          </p>

          <div className="token-explainer-grid">
            {[
              { action: 'Generate 1 Scene (Standard)', cost: '15 Tokens' },
              { action: 'Generate 1 Scene (Cinematic 4K)', cost: '40 Tokens' },
              { action: 'AI Agent Prompt Assistance', cost: '2 Tokens' },
              { action: 'Re-render Scene (Same Prompt)', cost: '10 Tokens' },
              { action: 'Final 4K Movie Merge', cost: 'Free' },
            ].map(row => (
              <div key={row.action} className="token-explainer-row">
                <span className="token-explainer-action">{row.action}</span>
                <span className="token-explainer-cost">{row.cost}</span>
              </div>
            ))}
          </div>
        </motion.section>

      </div>
    </div>
  )
}
