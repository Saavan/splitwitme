const leaves = [
  { top: '4%',  left: '3%',  size: '2.4rem', delay: '0s',    dur: '7s',  rot: '15deg'  },
  { top: '8%',  left: '88%', size: '3rem',   delay: '1.2s',  dur: '9s',  rot: '-20deg' },
  { top: '18%', left: '72%', size: '1.8rem', delay: '0.4s',  dur: '6s',  rot: '30deg'  },
  { top: '25%', left: '12%', size: '2.8rem', delay: '2.1s',  dur: '8s',  rot: '-10deg' },
  { top: '35%', left: '92%', size: '2rem',   delay: '0.8s',  dur: '7s',  rot: '25deg'  },
  { top: '45%', left: '5%',  size: '1.6rem', delay: '3s',    dur: '9s',  rot: '-35deg' },
  { top: '55%', left: '80%', size: '3.2rem', delay: '1.6s',  dur: '6s',  rot: '10deg'  },
  { top: '62%', left: '22%', size: '2.2rem', delay: '0.2s',  dur: '8s',  rot: '-15deg' },
  { top: '72%', left: '65%', size: '1.9rem', delay: '2.5s',  dur: '7s',  rot: '40deg'  },
  { top: '78%', left: '8%',  size: '2.6rem', delay: '1s',    dur: '9s',  rot: '-25deg' },
  { top: '85%', left: '90%', size: '2rem',   delay: '3.5s',  dur: '6s',  rot: '20deg'  },
  { top: '90%', left: '45%', size: '2.8rem', delay: '0.6s',  dur: '8s',  rot: '-5deg'  },
  { top: '14%', left: '50%', size: '1.5rem', delay: '4s',    dur: '7s',  rot: '50deg'  },
  { top: '50%', left: '42%', size: '3.4rem', delay: '1.8s',  dur: '10s', rot: '-30deg' },
]

const fleurs = [
  { top: '2%',  left: '50%', size: '1.4rem', opacity: 0.12 },
  { top: '48%', left: '2%',  size: '1.2rem', opacity: 0.10 },
  { top: '92%', left: '78%', size: '1.4rem', opacity: 0.12 },
]

export function MontrealBackground() {
  return (
    <>
      <style>{`
        @keyframes mtl-sway {
          0%   { transform: rotate(var(--r)) translateY(0px) translateX(0px); }
          25%  { transform: rotate(calc(var(--r) + 6deg)) translateY(-6px) translateX(4px); }
          50%  { transform: rotate(var(--r)) translateY(-10px) translateX(0px); }
          75%  { transform: rotate(calc(var(--r) - 6deg)) translateY(-6px) translateX(-4px); }
          100% { transform: rotate(var(--r)) translateY(0px) translateX(0px); }
        }
        @keyframes mtl-drip {
          0%   { height: 0; opacity: 0.7; }
          60%  { opacity: 0.7; }
          100% { height: 38px; opacity: 0; }
        }
        @keyframes mtl-drip2 {
          0%   { height: 0; opacity: 0.6; }
          60%  { opacity: 0.6; }
          100% { height: 28px; opacity: 0; }
        }
      `}</style>

      {/* Amber tint overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: 'linear-gradient(160deg, rgba(251,191,36,0.10) 0%, rgba(180,83,9,0.07) 50%, rgba(251,191,36,0.08) 100%)',
        }}
      />

      {/* Maple syrup drips from top */}
      <div className="fixed top-0 left-0 right-0 pointer-events-none z-0 overflow-hidden" style={{ height: '60px' }}>
        {[8, 18, 28, 38, 52, 63, 74, 84, 91].map((pct, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: 0,
              left: `${pct}%`,
              width: i % 3 === 0 ? '5px' : '3px',
              borderRadius: '0 0 3px 3px',
              background: 'linear-gradient(to bottom, rgba(146,64,14,0.55), rgba(180,83,9,0.35))',
              animationName: i % 2 === 0 ? 'mtl-drip' : 'mtl-drip2',
              animationDuration: `${2.8 + (i * 0.4)}s`,
              animationDelay: `${i * 0.35}s`,
              animationTimingFunction: 'ease-in',
              animationIterationCount: 'infinite',
            }}
          />
        ))}
      </div>

      {/* Maple leaves */}
      {leaves.map((l, i) => (
        <div
          key={i}
          className="fixed pointer-events-none z-0 select-none"
          style={{
            top: l.top,
            left: l.left,
            fontSize: l.size,
            ['--r' as any]: l.rot,
            animation: `mtl-sway ${l.dur} ${l.delay} ease-in-out infinite`,
            filter: 'drop-shadow(0 1px 2px rgba(146,64,14,0.3))',
          }}
        >
          🍁
        </div>
      ))}

      {/* Fleur-de-lis accents */}
      {fleurs.map((f, i) => (
        <div
          key={i}
          className="fixed pointer-events-none z-0 select-none"
          style={{
            top: f.top,
            left: f.left,
            fontSize: f.size,
            opacity: f.opacity,
          }}
        >
          ⚜️
        </div>
      ))}
    </>
  )
}
