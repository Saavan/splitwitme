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

// Each drip: horizontal position, stem width, max drip length, animation timing
const drips = [
  { pct:  5, w: 6,  h: 95,  dur: '5.8s', delay: '0s'   },
  { pct: 13, w: 4,  h: 62,  dur: '4.4s', delay: '1.1s' },
  { pct: 22, w: 9,  h: 130, dur: '7.2s', delay: '0.3s' },
  { pct: 31, w: 5,  h: 78,  dur: '5.3s', delay: '2.0s' },
  { pct: 40, w: 4,  h: 55,  dur: '4.7s', delay: '0.7s' },
  { pct: 50, w: 10, h: 150, dur: '8.0s', delay: '1.6s' },
  { pct: 59, w: 5,  h: 80,  dur: '5.5s', delay: '2.9s' },
  { pct: 68, w: 7,  h: 105, dur: '6.5s', delay: '0.2s' },
  { pct: 77, w: 4,  h: 60,  dur: '4.9s', delay: '1.8s' },
  { pct: 85, w: 8,  h: 115, dur: '6.9s', delay: '0.9s' },
  { pct: 93, w: 5,  h: 72,  dur: '5.1s', delay: '3.4s' },
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

        /* Slow viscous slide — syrup barely moves at first, then falls */
        @keyframes mtl-syrup-stem {
          0%   { height: 0px;       opacity: 0.90; }
          15%  { height: calc(var(--dh) * 0.08); opacity: 0.90; }
          45%  { height: calc(var(--dh) * 0.40); opacity: 0.85; }
          75%  { height: var(--dh); opacity: 0.80; }
          88%  { height: var(--dh); opacity: 0.55; }
          100% { height: var(--dh); opacity: 0;    }
        }

        /* Blob/teardrop at the tip — grows as drip extends, fades at the end */
        @keyframes mtl-syrup-blob {
          0%   { transform: translateY(0)          scaleX(1)   scaleY(1);   opacity: 0;    }
          15%  { transform: translateY(0)          scaleX(1)   scaleY(1);   opacity: 0.85; }
          75%  { transform: translateY(var(--dh))  scaleX(1.3) scaleY(1.1); opacity: 0.85; }
          88%  { transform: translateY(var(--dh))  scaleX(1.5) scaleY(0.8); opacity: 0.55; }
          100% { transform: translateY(var(--dh))  scaleX(1.5) scaleY(0.8); opacity: 0;    }
        }
      `}</style>

      {/* Amber tint overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: 'linear-gradient(160deg, rgba(251,191,36,0.10) 0%, rgba(180,83,9,0.07) 50%, rgba(251,191,36,0.08) 100%)',
        }}
      />

      {/* Syrup pool bar along the top edge — the reservoir the drips hang from */}
      <div
        className="fixed top-0 left-0 right-0 pointer-events-none z-0"
        style={{
          height: '7px',
          background: 'linear-gradient(to bottom, rgba(101,44,5,0.82), rgba(146,64,14,0.68))',
          boxShadow: '0 2px 8px rgba(101,44,5,0.35)',
        }}
      />

      {/* Maple syrup drips */}
      <div className="fixed top-0 left-0 right-0 pointer-events-none z-0 overflow-visible" style={{ height: 0 }}>
        {drips.map((d, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: '7px', // start just below the pool bar
              left: `${d.pct}%`,
              width: `${d.w}px`,
              ['--dh' as any]: `${d.h}px`,
            }}
          >
            {/* Stem */}
            <div
              style={{
                width: '100%',
                borderRadius: '0 0 2px 2px',
                background: `linear-gradient(to bottom, rgba(101,44,5,0.90), rgba(146,64,14,0.78))`,
                animation: `mtl-syrup-stem ${d.dur} ${d.delay} cubic-bezier(0.6,0,0.9,1) infinite`,
                ['--dh' as any]: `${d.h}px`,
              }}
            />
            {/* Teardrop blob at the tip */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: `${-d.w * 0.4}px`,
                width: `${d.w * 1.8}px`,
                height: `${d.w * 1.8}px`,
                borderRadius: '50%',
                background: `rgba(146,64,14,0.82)`,
                animation: `mtl-syrup-blob ${d.dur} ${d.delay} cubic-bezier(0.6,0,0.9,1) infinite`,
                ['--dh' as any]: `${d.h - d.w}px`,
              }}
            />
          </div>
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
